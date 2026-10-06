import type { CSSProperties } from "react";
export const PARTICLES = Array.from({ length: 22 }, (_, index) => {
  const angle = (index / 22) * Math.PI * 2;
  const distance = 95 + (index % 4) * 20;
  return {
    "--fw-particle-x": `${Math.cos(angle) * distance}px`,
    "--fw-particle-y": `${Math.sin(angle) * distance - 35}px`,
    "--fw-particle-rotation": `${index * 47}deg`,
    "--fw-particle-delay": `${(index % 3) * 25}ms`,
  } as CSSProperties;
});
