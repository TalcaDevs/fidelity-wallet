import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { renderFallbackLogoSvg, renderStampStripSvg } from '@fidelity/shared';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service.js';
import { CardAssetsStorageService } from './card-assets-storage.service.js';
import { toCardView, type CardView } from './card-program.js';

const MAX_RENDERS = 500;
const MAX_SOURCES = 100;
const SOURCE_TIMEOUT_MS = 5000;

/** Map con tope: al llenarse descarta lo más antiguo. Basta para un servicio de imágenes inmutables. */
class BoundedCache<V> {
  private readonly entries = new Map<string, V>();
  constructor(private readonly max: number) {}

  get(key: string): V | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: V): void {
    if (this.entries.size >= this.max) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, value);
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}

/**
 * Dibuja las imágenes que Google Wallet descarga del backend: la tira de sellos de cada saldo y
 * el logo de reemplazo. La URL lleva la versión del diseño, así que lo dibujado no cambia nunca.
 */
@Injectable()
export class CardRenderService {
  private readonly logger = new Logger(CardRenderService.name);
  private readonly renders = new BoundedCache<Promise<Buffer>>(MAX_RENDERS);
  private readonly sources = new BoundedCache<Promise<string | null>>(MAX_SOURCES);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: CardAssetsStorageService,
  ) {}

  strip(programId: string, version: number, target: number, filled: number): Promise<Buffer> {
    return this.cached(`strip:${programId}:${version}:${target}:${filled}`, async () => {
      const { card, brandId } = await this.card(programId, version);
      const { design } = card;
      const [hero, empty, full] = await Promise.all([
        this.dataUri(design.heroImageUrl, brandId),
        this.dataUri(design.stampEmptyImageUrl, brandId),
        this.dataUri(design.stampFilledImageUrl, brandId),
      ]);
      const svg = renderStampStripSvg(design, target, filled, { hero, empty, filled: full });
      return sharp(Buffer.from(svg)).png().toBuffer();
    });
  }

  logo(programId: string, version: number): Promise<Buffer> {
    return this.cached(`logo:${programId}:${version}`, async () => {
      const { card } = await this.card(programId, version);
      return sharp(Buffer.from(renderFallbackLogoSvg(card.design))).png().toBuffer();
    });
  }

  private cached(key: string, render: () => Promise<Buffer>): Promise<Buffer> {
    const hit = this.renders.get(key);
    if (hit) return hit;
    const pending = render();
    this.renders.set(key, pending);
    // Un error no se queda en caché: el próximo pedido vuelve a intentar.
    pending.catch(() => this.renders.delete(key));
    return pending;
  }

  /**
   * Una versión futura no existe: así nadie llena la caché pidiendo versiones al azar. Una
   * anterior se dibuja con el diseño actual (Google puede pedirla mientras se reenvían los pases).
   */
  private async card(programId: string, version: number): Promise<{ card: CardView; brandId: string }> {
    const program = await this.prisma.loyaltyProgram.findUnique({ where: { id: programId } });
    if (!program || version > program.designVersion) throw new NotFoundException('La tarjeta no existe');
    return { card: toCardView(program), brandId: program.brandId };
  }

  /** La librería de SVG no descarga URLs: las imágenes van embebidas. Solo del bucket de la marca. */
  private dataUri(url: string | null, brandId: string): Promise<string | null> {
    if (!url || !this.storage.belongsToBrand(url, brandId)) return Promise.resolve(null);
    const hit = this.sources.get(url);
    if (hit) return hit;
    const pending = (async () => {
      try {
        const res = await fetch(this.storage.downloadUrl(url), { signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = res.headers.get('content-type') ?? 'image/png';
        const buffer = Buffer.from(await res.arrayBuffer());
        return `data:${type};base64,${buffer.toString('base64')}`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`No se pudo leer la imagen ${url}: ${msg}`);
        this.sources.delete(url);
        return null;
      }
    })();
    this.sources.set(url, pending);
    return pending;
  }
}
