import { describe, expect, it } from 'vitest';
import { particleTarget, type Particle } from './particleField';

const particle: Particle = { anchorX: 100, anchorY: 100, x: 100, y: 100, phase: 0, radius: 1, color: 0 };

describe('Login particle interaction', () => {
  it('drifts autonomously without a pointer and stays near its anchor over time', () => {
    const initial = particleTarget(particle, 0, null);
    const later = particleTarget(particle, 3000, null);
    expect(Math.hypot(later.x - initial.x, later.y - initial.y)).toBeGreaterThan(10);
    for (let time = 0; time <= 60000; time += 1000) {
      const target = particleTarget(particle, time, null);
      expect(Math.abs(target.x - particle.anchorX)).toBeLessThanOrEqual(24);
      expect(Math.abs(target.y - particle.anchorY)).toBeLessThanOrEqual(18);
    }
  });

  it('moves away from a nearby pointer and resumes its gentle drift when the pointer leaves', () => {
    const baseline = particleTarget(particle, 0, null);
    const pointer = { x: baseline.x - 10, y: baseline.y };
    const repelled = particleTarget(particle, 0, pointer);
    expect(repelled.x).toBeGreaterThan(baseline.x);
    expect(repelled.y).toBe(baseline.y);
    expect(particleTarget(particle, 0, { x: 1000, y: 1000 })).toEqual(baseline);
    expect(particleTarget(particle, 0, null)).toEqual(baseline);
  });

  it('keeps repulsion finite when the pointer is exactly over a particle', () => {
    const baseline = particleTarget(particle, 0, null);
    const result = particleTarget(particle, 0, baseline);
    expect(Number.isFinite(result.x) && Number.isFinite(result.y)).toBe(true);
    expect(Math.hypot(result.x - baseline.x, result.y - baseline.y)).toBeCloseTo(38);
  });
});
