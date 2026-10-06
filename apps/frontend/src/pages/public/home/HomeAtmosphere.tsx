import { motion, useScroll, useTransform } from "motion/react";

export function HomeAtmosphere({ motionPaused }: { motionPaused: boolean }) {
  const { scrollYProgress } = useScroll();
  const drift = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const turn = useTransform(scrollYProgress, [0, 1], [-12, 22]);

  return (
    <div className="fw-atmosphere" aria-hidden="true">
      <motion.div
        className="fw-atmosphere-follow"
        style={{ y: motionPaused ? 0 : drift, rotate: motionPaused ? 0 : turn }}
      >
        <div className="fw-atmosphere-halo fw-atmosphere-blue" />
        <div className="fw-atmosphere-halo fw-atmosphere-gold" />
        <div className="fw-atmosphere-ring" />
      </motion.div>
      <motion.div
        className="fw-reading-line"
        style={{ scaleY: motionPaused ? 0 : scrollYProgress }}
      />
    </div>
  );
}
