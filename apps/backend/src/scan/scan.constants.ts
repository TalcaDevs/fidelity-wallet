// Canje: evita el doble toque del cajero sobre el botón de canjear.
export const REDEEM_DUPLICATE_WINDOW_MS = 90 * 1000; // 90 seconds
export const VISIT_REDEMPTION_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 horas

// Sellos: tras sumar un sello (por QR o ingreso manual), el pase queda bloqueado para sumar
// otro durante este tiempo. Evita que un mismo cliente acumule varios sellos en una visita.
export const DEFAULT_STAMP_COOLDOWN_MINUTES = 30;

// Puntos: el monto de cada compra da sus puntos y un cliente puede comprar dos veces seguidas.
// Solo se frena el doble envío de la misma compra.
export const POINTS_DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export const RECEIPT_LABEL = { label: 'La foto de la boleta', fallbackName: 'boleta' };

export const clp = new Intl.NumberFormat('es-CL');
