import { motion, useScroll, useTransform } from "motion/react";

export function HomeAtmosphere({ motionPaused }: { motionPaused: boolean }) {
  const { scrollYProgress } = useScroll();
  const drift = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const turn = useTransform(scrollYProgress, [0, 1], [-12, 22]);

  return (
    <div
      className="fw-atmosphere fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <motion.div
        className="fw-atmosphere-follow absolute inset-[-15%] [will-change:transform]"
        style={{ y: motionPaused ? 0 : drift, rotate: motionPaused ? 0 : turn }}
      >
        <div className="fw-atmosphere-halo absolute w-[65vw] h-[65vw] min-w-[420px] min-h-[420px] rounded-full opacity-[0.28] fw-atmosphere-blue right-[-5%] top-[-15%]" />
        <div className="fw-atmosphere-halo absolute w-[65vw] h-[65vw] min-w-[420px] min-h-[420px] rounded-full opacity-[0.28] fw-atmosphere-gold left-[-22%] bottom-[-35%]" />
        <div className="fw-atmosphere-ring absolute w-[105vw] h-[105vw] [border:1px_solid_#087bd70a] rounded-[48%] top-[8%] right-[-74%]" />
      </motion.div>
      <motion.div
        className="fw-reading-line absolute top-0 left-0 w-[2px] h-full opacity-[0.45]"
        style={{ scaleY: motionPaused ? 0 : scrollYProgress }}
      />
    </div>
  );
}
