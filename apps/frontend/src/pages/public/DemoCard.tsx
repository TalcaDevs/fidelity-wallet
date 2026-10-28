import { useMemo } from 'react';
import QRCode from 'qrcode';
import { demoBalances, type DemoStage } from './demoModel';

export function DemoQR() {
  const matrix = useMemo(() => QRCode.create('FIDELITY-DEMO-NOT-A-VALID-PASS', { errorCorrectionLevel: 'M' }).modules, []);
  return <svg aria-label="QR de demostración" role="img" viewBox={`-4 -4 ${matrix.size + 8} ${matrix.size + 8}`} className="demo-qr">
    <rect x="-4" y="-4" width={matrix.size + 8} height={matrix.size + 8} fill="white" />
    {Array.from(matrix.data).map((cell, i) => cell ? <rect key={i} x={i % matrix.size} y={Math.floor(i / matrix.size)} width="1" height="1" fill="#172e2a" /> : null)}
  </svg>;
}

export function DemoCard({ stage, brand, mark, onPresent, onReward }: { stage: DemoStage; brand: string; mark: string; onPresent: () => void; onReward: () => void }) {
  const { stamps, redeemed } = demoBalances(stage);
  const showQR = ['scan', 'scanning', 'purchase'].includes(stage);
  return <div className="demo-phone">
    <div className="demo-phone-status" aria-hidden="true"><span>9:41</span><span className="demo-island" /><span>▰</span></div>
    <div className="demo-phone-heading"><span>Mi tarjeta</span><span className="demo-mini-avatar">M</span></div>
    <div className="demo-loyalty-card">
      <div className="demo-card-orbit" aria-hidden="true" />
      <header><span className="demo-brand-mark" aria-hidden="true">{mark}</span><span className="demo-card-brand">{brand}<small>CAFÉ & BUENOS MOMENTOS</small></span></header>
      <div className="demo-card-art" aria-hidden="true"><span className="demo-sun">✺</span><svg viewBox="0 0 200 120"><path d="M44 34h99v34c0 27-20 40-49 40S44 95 44 68Z" fill="currentColor"/><path d="M143 42h10c31 0 31 39 0 39h-13M30 112h128" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/><path className="demo-steam" d="M76 23c-15-12 12-13 0-25M105 23c-15-12 12-13 0-25" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg><span className="demo-card-script">Tu pausa favorita.</span></div>
      <p className="demo-card-reward">Cinco visitas.<br /><strong>El próximo café va por nosotros.</strong></p>
      <div className="demo-stamps" aria-label={`${stamps} de 5 sellos`}>{Array.from({ length: 5 }, (_, i) => <span key={`${i}-${i < stamps}`} className={`${i < stamps ? 'is-filled' : ''} ${i === 4 && stamps === 5 ? 'demo-stamp-earned' : ''}`} aria-hidden="true">{i < stamps ? mark : i + 1}</span>)}</div>
      <footer><span>MARÍA GONZÁLEZ</span><strong>{stamps} / 5 sellos</strong></footer>
    </div>
    <div className="demo-phone-bottom">
      {stage === 'reward' || stage === 'redeem' ? <div className="demo-reward-pop"><span className="demo-reward-star" aria-hidden="true">✦</span><strong>¡Tu café está listo!</strong><p>Cinco visitas que tienen premio.</p>{stage === 'reward' ? <button className="demo-client-action demo-target" onClick={onReward}>Elegir mi café de regalo →</button> : <span className="demo-client-note">Premio elegido. Confírmalo en caja.</span>}</div> : showQR ? <div className="demo-qr-reveal"><DemoQR /><p>{stage === 'purchase' ? '✓ Tarjeta reconocida en caja' : 'Presenta este QR en caja'}</p></div> : <><p className="demo-phone-caption">{redeemed ? 'Un café disfrutado. Muchos por venir.' : 'Te falta una visita para tu café de regalo.'}</p>{stage === 'present' ? <button className="demo-client-action demo-target" onClick={onPresent}>Mostrar mi QR <span aria-hidden="true">▦</span></button> : <div className="demo-client-note">{redeemed ? 'Tu tarjeta sigue activa · 0 de 5 sellos' : 'Vista previa de la tarjeta de María'}</div>}</>}
    </div>
    <div className="demo-phone-home" aria-hidden="true" />
  </div>;
}
