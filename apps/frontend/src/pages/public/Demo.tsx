import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { PublicFrame } from '../../components/PublicFrame';
import { DemoMerchant } from './DemoMerchant';
import { DemoCard } from './DemoCard';
import { DEMO_GUIDE, DEMO_STYLES, type DemoStage, type OwnerView } from './demoModel';
import './demo.css';

const chapters = ['Tu marca', 'Una visita', 'Un sello', 'Un premio', 'Tu negocio'];

export default function Demo() {
  const [stage, setStage] = useState<DemoStage>('design');
  const [brandInput, setBrand] = useState('Café Aurora');
  const [styleIndex, setStyle] = useState(0);
  const [view, setView] = useState<OwnerView>('metrics');
  const [paused, setPaused] = useState(false);
  const [mobileView, setMobileView] = useState<'client' | 'owner'>('owner');
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const focusNext = useRef(false);
  const guide = DEMO_GUIDE[stage];
  const brand = brandInput.trim() || 'Café Aurora';
  const style = DEMO_STYLES[styleIndex];
  const motionOff = Boolean(reduced) || paused;

  function go(next: DemoStage) {
    focusNext.current = true;
    setStage(next);
    setMobileView(DEMO_GUIDE[next].actor);
  }
  function restart() {
    setView('metrics');
    go('design');
  }
  useEffect(() => {
    if (stage !== 'scanning') return;
    const timer = window.setTimeout(() => {
      focusNext.current = true;
      setStage('purchase');
      setMobileView('owner');
    }, motionOff ? 0 : 1600);
    return () => window.clearTimeout(timer);
  }, [stage, motionOff]);
  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    root.current?.querySelector<HTMLElement>(`[data-demo-side="${guide.actor}"] .demo-target`)?.focus({ preventScroll: true });
  }, [stage, guide.actor]);

  return <PublicFrame><div ref={root} className="demo-experience" data-motion-off={motionOff} style={{ '--demo-brand': style.color, '--demo-cream': style.accent } as CSSProperties}>
    <header className="demo-intro"><div><p className="demo-eyebrow">DE TU MOSTRADOR A SU PRÓXIMA VISITA</p><h1>Un café. <span>Muchas ganas de volver.</span></h1><p>Vive los dos lados de Fidelity. Tu marca, tu clienta, tu negocio.</p></div><div className="demo-controls"><button aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Activar animaciones' : 'Pausar animaciones'}</button><button onClick={restart}>↺ Reiniciar demo</button></div></header>
    <ol className="demo-chapters" aria-label="Progreso de la demo">{chapters.map((chapter, index) => <li key={chapter} className={index <= guide.chapter ? 'is-reached' : ''} aria-current={index === guide.chapter ? 'step' : undefined}><span>{index < guide.chapter ? '✓' : `0${index + 1}`}</span>{chapter}</li>)}</ol>
    <div className="demo-guide" role="status" aria-live="polite" aria-atomic="true"><span className={`demo-guide-icon ${guide.actor}`} aria-hidden="true">{guide.actor === 'client' ? 'M' : 'TÚ'}</span><div><strong>{guide.title}</strong><p>{guide.hint}</p></div><span className="demo-guide-role">{guide.actor === 'client' ? 'Actúa como cliente' : 'Actúa como dueño'}</span></div>
    <div className="demo-mobile-switch" aria-label="Vistas de la demo"><button aria-pressed={mobileView === 'client'} onClick={() => setMobileView('client')}>Teléfono del cliente</button><button aria-pressed={mobileView === 'owner'} onClick={() => setMobileView('owner')}>Tu comercio</button></div>
    <div className="demo-stage">
      <section data-demo-side="client" data-mobile-visible={mobileView === 'client'} className={`demo-client-zone ${guide.actor === 'client' ? 'is-active' : ''}`} aria-label="Vista del cliente"><div className="demo-zone-label"><span>01 / CLIENTE</span><strong>Así lo vive María</strong><small>Su tarjeta, siempre a mano.</small></div><DemoCard stage={stage} brand={brand} mark={style.mark} onPresent={() => go('scan')} onReward={() => go('redeem')} /><p className="demo-simulation-note">Tarjeta web de ejemplo · no es un pase Wallet</p></section>
      <section data-demo-side="owner" data-mobile-visible={mobileView === 'owner'} className={`demo-owner-zone ${guide.actor === 'owner' ? 'is-active' : ''}`} aria-label="Vista del dueño"><div className="demo-zone-label"><span>02 / COMERCIO</span><strong>Tú llevas el control</strong><small>{stage === 'insights' ? 'Conoce a tus clientes y sus visitas.' : 'Una atención simple, de principio a fin.'}</small></div><DemoMerchant stage={stage} brand={brand} brandInput={brandInput} styleIndex={styleIndex} view={view} setBrand={setBrand} setStyle={setStyle} setView={setView} onStart={() => go('present')} onScan={() => go('scanning')} onPurchase={() => go('reward')} onRedeem={() => go('insights')} /></section>
    </div>
    {stage === 'insights' && <section className="demo-finale demo-scene-enter"><span aria-hidden="true">✦</span><div><h2>Ahora imagínalo en tu mostrador.</h2><p>Tu identidad en cada tarjeta. Cada visita y cada premio, en tu panel.</p></div><a href="/#contacto" className="demo-owner-action">Quiero esto para mi comercio ↗</a></section>}
    <p className="demo-disclaimer">Demo guiada con datos ficticios. La lectura, compra y canje son simulados. Puedes reiniciarla conservando tu diseño.</p>
  </div></PublicFrame>;
}
