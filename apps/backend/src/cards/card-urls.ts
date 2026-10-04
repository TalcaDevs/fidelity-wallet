import type { CardView } from './card-program.js';

/** Raíz pública del backend (BACKEND_URL): Google Wallet descarga desde acá las imágenes. */
export function backendBaseUrl(raw: string | undefined): string {
  return (raw || 'http://localhost:3000').replace(/\/+$/, '');
}

/** Tira de sellos de un pase. La versión del diseño va en la ruta: al editar cambia la URL. */
export function stampStripUrl(base: string, card: CardView, target: number, filled: number): string {
  return `${base}/api/public/cards/${card.programId}/${card.designVersion}/strip/${target}/${filled}`;
}

export function fallbackLogoUrl(base: string, card: CardView): string {
  return `${base}/api/public/cards/${card.programId}/${card.designVersion}/logo`;
}

export function cardLogoUrl(base: string, card: CardView): string {
  return card.design.logoUrl ?? fallbackLogoUrl(base, card);
}
