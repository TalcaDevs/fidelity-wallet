import { InternalServerErrorException, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicStorageUrl } from './storage-url.js';

const SIGNED_URL_TTL_SECONDS = 5 * 60;

export interface BucketOptions {
  bucket: string;
  fileSizeLimit: number;
  allowedMimeTypes: readonly string[];
  /** Mensaje al usuario si la subida falla. */
  uploadErrorMessage: string;
}

export type PrivateBucketOptions = BucketOptions;

/** Bucket de Supabase Storage en el que solo escribe el backend (service_role). */
abstract class BucketStorage {
  private readonly logger: Logger;
  private client: SupabaseClient | null = null;
  private bucketReady: Promise<void> | null = null;

  protected abstract readonly isPublic: boolean;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly options: BucketOptions,
  ) {
    this.logger = new Logger(`Storage:${options.bucket}`);
  }

  protected getClient(): SupabaseClient {
    if (!this.client) {
      const url = this.configService.get<string>('SUPABASE_URL');
      const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !key) {
        throw new InternalServerErrorException(
          'Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY',
        );
      }
      this.client = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return this.client;
  }

  // El bucket se crea desde acá y no por migración: el esquema storage lo administra el
  // servicio de Storage de Supabase, no Prisma.
  private ensureBucket(): Promise<void> {
    const { bucket, fileSizeLimit, allowedMimeTypes } = this.options;
    this.bucketReady ??= (async () => {
      const storage = this.getClient().storage;
      const { data } = await storage.getBucket(bucket);
      if (data) return;
      const { error } = await storage.createBucket(bucket, {
        public: this.isPublic,
        fileSizeLimit,
        allowedMimeTypes: [...allowedMimeTypes],
      });
      if (error && !/already exists/i.test(error.message)) throw error;
    })().catch((err: unknown) => {
      this.bucketReady = null;
      throw err;
    });
    return this.bucketReady;
  }

  async upload(
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.ensureBucket();
    const { error } = await this.getClient()
      .storage.from(this.options.bucket)
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });
    if (error) {
      throw new InternalServerErrorException(this.options.uploadErrorMessage, {
        cause: error,
      });
    }
  }

  /**
   * Sube primero y persiste después: si la escritura en la BD falla, se borra lo subido para no
   * dejar archivos huérfanos. Al revés quedarían filas apuntando a archivos inexistentes.
   */
  async uploadThen<T>(
    upload: { path: string; buffer: Buffer; contentType: string } | null,
    persist: () => Promise<T>,
  ): Promise<T> {
    if (upload)
      await this.upload(upload.path, upload.buffer, upload.contentType);
    try {
      return await persist();
    } catch (err) {
      if (upload) await this.remove([upload.path]);
      throw err;
    }
  }

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await this.getClient()
      .storage.from(this.options.bucket)
      .remove(paths);
    if (error)
      this.logger.warn(
        `No se pudieron borrar archivos huérfanos: ${error.message}`,
      );
  }

}

/** Privado: los archivos se leen con URLs firmadas que vencen en 5 minutos. */
export class PrivateBucketStorage extends BucketStorage {
  protected readonly isPublic = false;

  async signedUrls(paths: string[]): Promise<Map<string, string>> {
    if (paths.length === 0) return new Map();
    const { data, error } = await this.getClient()
      .storage.from(this.options.bucket)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (error || !data) {
      throw new InternalServerErrorException(
        'No se pudieron preparar los archivos adjuntos',
        { cause: error },
      );
    }
    const urls = new Map<string, string>();
    for (const { path, signedUrl } of data) {
      if (path && signedUrl) urls.set(path, signedUrl);
    }
    return urls;
  }
}

/** Público: cualquiera con la URL lee el archivo (lo necesitan Google Wallet y la landing). */
export class PublicBucketStorage extends BucketStorage {
  protected readonly isPublic = true;

  /**
   * SUPABASE_PUBLIC_URL reemplaza el origen de SUPABASE_URL en las URLs públicas: en local Supabase
   * está en 127.0.0.1, que ni Google ni un celular alcanzan (se usa con un túnel HTTPS).
   */
  publicUrl(path: string): string {
    return publicStorageUrl(
      this.getClient().storage.from(this.options.bucket).getPublicUrl(path).data.publicUrl,
      this.configService,
    );
  }

  /** Prefijo de las URLs de una carpeta: sirve para comprobar que una URL es de este bucket. */
  publicPrefix(folder: string): string {
    return this.publicUrl(`${folder}/`);
  }
}
