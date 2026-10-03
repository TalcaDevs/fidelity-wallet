import { InternalServerErrorException, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SIGNED_URL_TTL_SECONDS = 5 * 60;

export interface PrivateBucketOptions {
  bucket: string;
  fileSizeLimit: number;
  allowedMimeTypes: readonly string[];
  /** Mensaje al usuario si la subida falla. */
  uploadErrorMessage: string;
}

/**
 * Bucket privado de Supabase Storage al que solo accede el backend (service_role). Los archivos
 * se leen con URLs firmadas que vencen en 5 minutos.
 */
export class PrivateBucketStorage {
  private readonly logger: Logger;
  private client: SupabaseClient | null = null;
  private bucketReady: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly options: PrivateBucketOptions,
  ) {
    this.logger = new Logger(`Storage:${options.bucket}`);
  }

  private getClient(): SupabaseClient {
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
        public: false,
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
