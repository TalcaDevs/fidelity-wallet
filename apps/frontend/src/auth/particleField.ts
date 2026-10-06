export interface Particle {
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  radius: number;
  phase: number;
  color: number;
}

export interface ParticlePointer { x: number; y: number }

export function createParticleField(width: number, height: number): Particle[] {
  const count = Math.min(72, Math.max(24, Math.round(width * height / 18000)));
  return Array.from({ length: count }, (_, index) => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    return { anchorX: x, anchorY: y, x, y, radius: 1 + Math.random() * 1.3, phase: Math.random() * Math.PI * 2, color: index % 3 };
  });
}

/** Gentle drift, with a bounded push away from the pointer; no velocity can accumulate. */
export function particleTarget(particle: Particle, time: number, pointer: ParticlePointer | null): ParticlePointer {
  let x = particle.anchorX + Math.sin(time * 0.0004 + particle.phase) * 24;
  let y = particle.anchorY + Math.cos(time * 0.00032 + particle.phase) * 18;
  if (pointer) {
    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 120) {
      const force = (1 - distance / 120) ** 2 * 38;
      const angle = distance > 0.01 ? Math.atan2(dy, dx) : particle.phase;
      x += Math.cos(angle) * force;
      y += Math.sin(angle) * force;
    }
  }
  return { x, y };
}
