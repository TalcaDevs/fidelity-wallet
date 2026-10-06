import { useEffect, useRef } from 'react';
import { createParticleField, particleTarget, type Particle, type ParticlePointer } from './particleField';

export function AuthParticles({ dark, reducedMotion }: { dark: boolean; reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const colors = dark ? ['#67b9fa', '#f0c359', '#f6ad75'] : ['#087bd7', '#b48608', '#d66409'];
    let particles: Particle[] = [];
    let pointer: ParticlePointer | null = null;
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let lastDraw = 0;
    let elapsed = 0;

    const draw = (delta: number) => {
      context.clearRect(0, 0, width, height);
      context.globalAlpha = dark ? 0.32 : 0.25;
      for (const particle of particles) {
        if (!reducedMotion) {
          const target = particleTarget(particle, elapsed, pointer);
          const ease = 1 - Math.exp(-delta / 140);
          particle.x += (target.x - particle.x) * ease;
          particle.y += (target.y - particle.y) * ease;
        }
        context.fillStyle = colors[particle.color]!;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = createParticleField(width, height);
      draw(0);
    };
    const tick = (time: number) => {
      // 30 fps is enough for this subtle backdrop. Hidden tabs have no active frame.
      if (time - lastDraw >= 1000 / 30) {
        const delta = lastTime ? Math.min(time - lastTime, 64) : 1000 / 30;
        elapsed += delta;
        draw(delta);
        lastDraw = time;
        lastTime = time;
      }
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      pointer = null;
    };
    const resume = () => {
      stop();
      if (!reducedMotion && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointer = { x: event.clientX, y: event.clientY };
    };
    const leave = () => { pointer = null; };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (!reducedMotion) {
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('blur', leave);
      document.documentElement.addEventListener('pointerleave', leave);
      document.addEventListener('visibilitychange', resume);
    }
    resume();
    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', leave);
      document.documentElement.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [dark, reducedMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" data-motion-active={!reducedMotion} className="pointer-events-none fixed inset-0 h-full w-full" />;
}
