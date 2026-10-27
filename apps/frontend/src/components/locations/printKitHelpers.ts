import type { CardConfigDto } from '@fidelity/shared';

export type PaperSize = 'A5' | 'LETTER' | 'OFICIO';
export type ColorMode = 'BRAND' | 'MONO' | 'CUSTOM';

export interface FlyerRenderOptions {
  paperSize: PaperSize;
  colorMode: ColorMode;
  brandName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  headline: string;
  subheadline: string;
  incentive: string;
  qrDataUrl: string;
  locationName: string;
  commune?: string | null;
  joinUrl: string;
  origin?: string;
}

/**
 * Genera el texto del gancho/promesa dinámicamente según la configuración de la tarjeta y sus recompensas.
 */
export function getDefaultIncentiveText(cardConfig?: CardConfigDto | null): string {
  if (!cardConfig) {
    return 'Junta 10 sellos y llévate tu premio gratis';
  }

  const firstReward = cardConfig.rewards && cardConfig.rewards.length > 0 ? cardConfig.rewards[0] : null;
  if (firstReward) {
    const isPoints = firstReward.currency === 'POINTS' || cardConfig.type === 'POINTS';
    const unit = isPoints ? 'puntos' : 'sellos';
    return `Junta ${firstReward.target} ${unit} y llévate ${firstReward.name}`;
  }

  if (cardConfig.type === 'POINTS') {
    return 'Acumula puntos con cada compra y canjea premios gratis';
  }

  return 'Junta 10 sellos y llévate tu premio gratis';
}

/**
 * Genera el documento HTML completo y autosuficiente para imprimir en tamaño Carta, A5 u Oficio.
 */
export function generateFlyerHtml(options: FlyerRenderOptions): string {
  const origin = options.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const isA5 = options.paperSize === 'A5';
  const isOficio = options.paperSize === 'OFICIO';
  const isMono = options.colorMode === 'MONO';
  const primaryColor = isMono ? '#0F172A' : options.primaryColor || '#1E3A8A';
  const accentBg = isMono ? '#F1F5F9' : '#FEF3C7';
  const accentBorder = isMono ? '#CBD5E1' : '#FDE68A';
  const accentText = isMono ? '#0F172A' : '#92400E';

  const pageSizeRule = isA5
    ? 'a5 portrait'
    : isOficio
      ? 'legal portrait'
      : 'letter portrait';

  const qrSize = isA5 ? '210px' : isOficio ? '280px' : '260px';
  const baseFontSize = isA5 ? '13px' : isOficio ? '15px' : '14px';
  const headlineSize = isA5 ? '26px' : isOficio ? '34px' : '30px';
  const sheetPadding = isA5 ? '12mm 14mm' : isOficio ? '18mm 20mm' : '16mm 18mm';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Kit Mesón - ${escapeHtml(options.brandName)} - ${escapeHtml(options.locationName)}</title>
  <style>
    @page {
      size: ${pageSizeRule};
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #FFFFFF;
      color: #0F172A;
      font-size: ${baseFontSize};
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .sheet {
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      padding: ${sheetPadding};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      overflow: hidden;
      background: #FFFFFF;
    }
    .poster-frame {
      width: 100%;
      height: 100%;
      border: 3px solid ${primaryColor};
      border-radius: 24px;
      padding: ${isA5 ? '20px 22px' : isOficio ? '30px 32px' : '28px 30px'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      position: relative;
      background: linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%);
    }
    .top-pill {
      display: inline-block;
      padding: 6px 18px;
      border-radius: 9999px;
      background: ${primaryColor};
      color: #FFFFFF;
      font-weight: 800;
      font-size: ${isA5 ? '11px' : '12px'};
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .brand-logo-container {
      max-height: ${isA5 ? '65px' : isOficio ? '90px' : '80px'};
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 6px;
    }
    .brand-logo {
      max-height: ${isA5 ? '65px' : isOficio ? '90px' : '80px'};
      max-width: 240px;
      object-fit: contain;
    }
    .brand-name {
      font-size: ${isA5 ? '20px' : isOficio ? '26px' : '24px'};
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #0F172A;
    }
    .headline-block {
      margin: ${isA5 ? '8px 0' : isOficio ? '14px 0' : '12px 0'};
    }
    .headline {
      font-size: ${headlineSize};
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: #0F172A;
    }
    .subheadline {
      font-size: ${isA5 ? '14px' : isOficio ? '17px' : '16px'};
      font-weight: 600;
      color: #475569;
      margin-top: 4px;
    }
    .incentive-box {
      width: 100%;
      background: ${accentBg};
      border: 2px dashed ${accentBorder};
      border-radius: 16px;
      padding: ${isA5 ? '10px 14px' : isOficio ? '16px 20px' : '14px 18px'};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: ${isA5 ? '6px 0' : isOficio ? '12px 0' : '10px 0'};
    }
    .incentive-icon {
      font-size: ${isA5 ? '24px' : isOficio ? '32px' : '30px'};
      line-height: 1;
    }
    .incentive-title {
      font-size: ${isA5 ? '15px' : isOficio ? '19px' : '18px'};
      font-weight: 900;
      color: ${accentText};
      line-height: 1.25;
    }
    .incentive-sub {
      font-size: ${isA5 ? '11px' : '12px'};
      font-weight: 600;
      color: #64748B;
      margin-top: 2px;
    }
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: ${isA5 ? '8px 0' : isOficio ? '14px 0' : '12px 0'};
    }
    .qr-frame {
      position: relative;
      background: #FFFFFF;
      padding: 12px;
      border-radius: 20px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
      display: inline-flex;
    }
    .qr-image {
      width: ${qrSize};
      height: ${qrSize};
      display: block;
      image-rendering: pixelated;
    }
    .qr-corner {
      position: absolute;
      width: 16px;
      height: 16px;
      border-color: ${primaryColor};
      border-style: solid;
      pointer-events: none;
    }
    .qr-corner-tl { top: 6px; left: 6px; border-width: 3px 0 0 3px; border-top-left-radius: 6px; }
    .qr-corner-tr { top: 6px; right: 6px; border-width: 3px 3px 0 0; border-top-right-radius: 6px; }
    .qr-corner-bl { bottom: 6px; left: 6px; border-width: 0 0 3px 3px; border-bottom-left-radius: 6px; }
    .qr-corner-br { bottom: 6px; right: 6px; border-width: 0 3px 3px 0; border-bottom-right-radius: 6px; }
    .qr-caption {
      font-size: ${isA5 ? '12px' : '13px'};
      font-weight: 700;
      color: #334155;
      margin-top: 8px;
    }
    .steps-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: ${isA5 ? '12px' : isOficio ? '22px' : '20px'};
      margin: ${isA5 ? '6px 0' : isOficio ? '12px 0' : '10px 0'};
      width: 100%;
    }
    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      max-width: 110px;
    }
    .step-badge {
      width: ${isA5 ? '26px' : '30px'};
      height: ${isA5 ? '26px' : '30px'};
      border-radius: 9999px;
      background: ${primaryColor};
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: ${isA5 ? '12px' : '14px'};
    }
    .step-text {
      font-size: ${isA5 ? '11px' : '12px'};
      font-weight: 700;
      color: #1E293B;
      line-height: 1.2;
    }
    .step-arrow {
      font-size: ${isA5 ? '14px' : '16px'};
      font-weight: 900;
      color: #94A3B8;
      margin-top: -12px;
    }
    .wallets-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin: ${isA5 ? '6px 0' : isOficio ? '12px 0' : '10px 0'};
    }
    .wallets-label {
      font-size: ${isA5 ? '10px' : '11px'};
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748B;
    }
    .wallets-badges {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .wallet-badge-img {
      height: ${isA5 ? '34px' : isOficio ? '42px' : '40px'};
      width: auto;
      display: block;
    }
    .footer {
      width: 100%;
      border-top: 1px solid #E2E8F0;
      padding-top: ${isA5 ? '8px' : isOficio ? '14px' : '12px'};
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: ${isA5 ? '10px' : '12px'};
      color: #64748B;
    }
    .footer-loc {
      font-weight: 700;
      color: #334155;
    }
    .footer-url {
      font-weight: 600;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="poster-frame">
      <div>
        <div class="top-pill">Tarjeta Digital de Clientes</div>
        <div class="brand-logo-container">
          ${
            options.logoUrl
              ? `<img src="${escapeHtml(options.logoUrl)}" alt="${escapeHtml(options.brandName)}" class="brand-logo" />`
              : `<div class="brand-name">${escapeHtml(options.brandName)}</div>`
          }
        </div>
      </div>

      <div class="headline-block">
        <h1 class="headline">${escapeHtml(options.headline)}</h1>
        <p class="subheadline">${escapeHtml(options.subheadline)}</p>
      </div>

      <div class="incentive-box">
        <div class="incentive-icon">🎁</div>
        <div>
          <div class="incentive-title">${escapeHtml(options.incentive)}</div>
          <div class="incentive-sub">¡Sin descargar aplicaciones · Guárdala en tu celular con 1 toque!</div>
        </div>
      </div>

      <div class="qr-container">
        <div class="qr-frame">
          <div class="qr-corner qr-corner-tl"></div>
          <div class="qr-corner qr-corner-tr"></div>
          <div class="qr-corner qr-corner-bl"></div>
          <div class="qr-corner qr-corner-br"></div>
          <img src="${escapeHtml(options.qrDataUrl)}" alt="Código QR de registro" class="qr-image" />
        </div>
        <p class="qr-caption">Apunta la cámara de tu teléfono para escanear</p>
      </div>

      <div class="steps-row">
        <div class="step-item">
          <div class="step-badge">1</div>
          <div class="step-text">Abre tu cámara</div>
        </div>
        <div class="step-arrow">→</div>
        <div class="step-item">
          <div class="step-badge">2</div>
          <div class="step-text">Escanea el QR</div>
        </div>
        <div class="step-arrow">→</div>
        <div class="step-item">
          <div class="step-badge">3</div>
          <div class="step-text">Guarda en tu Wallet</div>
        </div>
      </div>

      <div class="wallets-container">
        <span class="wallets-label">Compatible con:</span>
        <div class="wallets-badges">
          <img src="${origin}/apple-wallet-es.svg" alt="Añadir a Apple Wallet" class="wallet-badge-img" />
          <img src="${origin}/google-wallet-es.svg" alt="Añadir a Google Wallet" class="wallet-badge-img" />
        </div>
      </div>

      <div class="footer">
        <div class="footer-loc">📍 ${escapeHtml(options.locationName)}${options.commune ? ` · ${escapeHtml(options.commune)}` : ''}</div>
        <div class="footer-url">${escapeHtml(options.joinUrl)}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Dispara la impresión del flyer en un iframe oculto para evitar bloqueadores de popups.
 */
export function printCounterFlyer(options: FlyerRenderOptions): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('title', 'Impresión Kit Mesón');
    document.body.appendChild(iframe);

    const html = generateFlyerHtml(options);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      resolve();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const images = Array.from(doc.images);
    const imagePromises = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((r) => {
        img.onload = () => r();
        img.onerror = () => r();
      });
    });

    const trigger = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Ignorar si el ambiente no permite print() directamente (e.g. headless jsdom)
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolve();
        }, 1000);
      }
    };

    if (imagePromises.length === 0) {
      setTimeout(trigger, 150);
    } else {
      Promise.all(imagePromises).then(() => setTimeout(trigger, 200));
    }
  });
}
