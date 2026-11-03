export type DemoStage = 'design' | 'present' | 'scan' | 'scanning' | 'purchase' | 'reward' | 'redeem' | 'insights';
export type OwnerView = 'metrics' | 'customer';

export const DEMO_STYLES = [
  { name: 'Bosque', color: '#16483f', accent: '#e0edb4', mark: '✳' },
  { name: 'Terracota', color: '#783c32', accent: '#ffe0af', mark: '✺' },
  { name: 'Medianoche', color: '#283d68', accent: '#d2ddff', mark: '✦' },
] as const;

export const DEMO_GUIDE: Record<DemoStage, { chapter: number; actor: 'client' | 'owner'; title: string; hint: string }> = {
  design: { chapter: 0, actor: 'owner', title: 'Primero, hazla tuya.', hint: 'Pon el nombre de tu café y elige su estilo. Mira cómo cambia la tarjeta de María.' },
  present: { chapter: 1, actor: 'client', title: 'María vuelve por su próximo café.', hint: 'Ahora eres la clienta. Toca “Mostrar mi QR” en su teléfono.' },
  scan: { chapter: 1, actor: 'owner', title: 'Tu turno en caja.', hint: 'Abre el lector del comercio. Reconoceremos la tarjeta de María en una lectura simulada.' },
  scanning: { chapter: 1, actor: 'owner', title: 'Una tarjeta. Una lectura.', hint: 'El lector está identificando a María. Todavía no se ha agregado ningún sello.' },
  purchase: { chapter: 2, actor: 'owner', title: 'Ya sabes a quién estás atendiendo.', hint: 'Confirma su compra en caja. Observa el quinto sello llegar al teléfono.' },
  reward: { chapter: 3, actor: 'client', title: 'Ese pequeño momento que invita a volver.', hint: 'María completó su tarjeta. Toca el premio en su teléfono para elegirlo.' },
  redeem: { chapter: 3, actor: 'owner', title: 'Un café para María.', hint: 'Entrega el premio y confirma el canje en caja. Sus cinco sellos se usarán una sola vez.' },
  insights: { chapter: 4, actor: 'owner', title: 'Y tú ves la historia completa.', hint: 'Explora las métricas y abre la ficha de María: la compra y el premio ya forman parte de su historial.' },
};

export function demoBalances(stage: DemoStage) {
  const purchased = ['reward', 'redeem', 'insights'].includes(stage);
  const redeemed = stage === 'insights';
  return { purchased, redeemed, stamps: redeemed ? 0 : purchased ? 5 : 4 };
}
