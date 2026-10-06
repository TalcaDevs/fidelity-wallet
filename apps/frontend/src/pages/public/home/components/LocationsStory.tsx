import LocationIcon from "../../../../assets/home/location.svg?react";
import { useHomeMotionPreference } from "../hooks/useHomeMotionPreference";
import { BranchMap } from "./BranchMap";
import { BranchSelector } from "./BranchSelector";
import { BranchDetail } from "./BranchDetail";
import type { LocationsStoryProps } from "../types/homeComponent.types.ts";
import { BRANCHES } from "../constants/locations.constants.ts";
import { HomeContainer } from "./HomeContainer";
import { useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";

export function LocationsStory({ motionPaused = false }: LocationsStoryProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useHomeMotionPreference();
  const inView = useInView(mapRef, { margin: "80px" });
  const [branchIndex, setBranchIndex] = useState(0);
  const branch = BRANCHES[branchIndex];
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end end"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 0.85], [12, 0]);
  const rotateZ = useTransform(scrollYProgress, [0, 0.85], [-4, 0]);
  const y = useTransform(scrollYProgress, [0, 0.85], [32, 0]);
  const staticMotion = motionPaused || reducedMotion;

  return (
    <section
      className={`
        fw-locations [&.fw-section]:pb-[58px] max-[820.001px]:[&.fw-section]:pb-[42px] relative fw-section
        py-[100px]
        [background:linear-gradient(_180deg,_transparent,_color-mix(in_srgb,_var(--fw-soft)_60%,_transparent)_46%,_transparent_)]
        max-[900.001px]:[padding-block:75px] max-[700.001px]:[padding-block:60px]
      `}
      id="sucursales"
      ref={sectionRef}
      aria-labelledby="fw-locations-title"
    >
      <HomeContainer
        className={`
        fw-locations-layout grid [grid-template-columns:minmax(0,_0.83fr)_minmax(0,_1.17fr)] items-start
        gap-[74px] min-h-[auto] max-[1100.001px]:gap-[40px]
        max-[1100.001px]:[grid-template-columns:minmax(0,_0.9fr)_minmax(0,_1.1fr)]
        max-[1100.001px]:min-h-[auto] max-[820.001px]:flex max-[820.001px]:flex-col
        max-[820.001px]:min-h-[auto] max-[820.001px]:gap-[28px]
        [@media((max-height:_600px)_and_(min-width:_821px))]:min-h-[auto]
      `}
      >
        <div className="fw-locations-copy [padding-block:32px_52px] max-[820.001px]:[padding-block:0]">
          <div
            className={`
        fw-locations-intro
      `}
          >
            <span
              className={`
        fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold tracking-[0.16em]
        mb-[17px] max-[700.001px]:text-[8px] max-[700.001px]:mb-[14px]
      `}
            >
              UNA MARCA. MUCHOS PUNTOS DE ENCUENTRO.
            </span>
            <h2
              id="fw-locations-title"
              className="text-[clamp(32px,_3.2vw,_46px)] leading-[1.16] font-[750] tracking-[-0.05em] max-[700.001px]:text-[35px]"
            >
              En cada esquina,
              <br />
              <span className="fw-blue-text text-[color:var(--fw-blue)]">
                la misma conexión.
              </span>
            </h2>
            <p className="max-w-[360px] mt-[26px] [color:var(--fw-muted)] text-[14px] leading-[1.85] max-[820.001px]:max-w-[470px]">
              Tu negocio puede estar en más de un lugar. La experiencia de tus
              clientes sigue siendo una sola.
            </p>
          </div>
          <ol
            className={`
        fw-locations-steps grid gap-[clamp(42px,_6vh,_80px)] list-none p-0 m-[80px_0_48px]
        max-[820.001px]:mt-[38px] max-[820.001px]:mb-[30px] max-[820.001px]:gap-[24px]
      `}
          >
            <li className="flex items-start gap-[20px] max-[820.001px]:gap-[15px]">
              <span
                className={`
        fw-locations-step-number [flex:0_0_33px] h-[33px] grid place-items-center
        [border:1px_solid_var(--fw-border)] rounded-full text-[color:var(--fw-blue)] text-[10px]
        font-extrabold [background:var(--fw-surface)]
      `}
              >
                01
              </span>
              <div>
                <h3 className="mb-[10px] text-[17px] leading-[1.45] tracking-[-0.5px]">
                  Pon tus locales en el mapa.
                </h3>
                <p className="max-w-[320px] [color:var(--fw-muted)] text-[12px] leading-[1.9] max-[820.001px]:max-w-[460px]">
                  Agrega sus direcciones y ubicaciones. Cada sucursal tiene su
                  lugar dentro de tu marca.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-[20px] max-[820.001px]:gap-[15px]">
              <span
                className={`
        fw-locations-step-number [flex:0_0_33px] h-[33px] grid place-items-center
        [border:1px_solid_var(--fw-border)] rounded-full text-[color:var(--fw-blue)] text-[10px]
        font-extrabold [background:var(--fw-surface)]
      `}
              >
                02
              </span>
              <div>
                <h3 className="mb-[10px] text-[17px] leading-[1.45] tracking-[-0.5px]">
                  Un equipo, bien conectado.
                </h3>
                <p className="max-w-[320px] [color:var(--fw-muted)] text-[12px] leading-[1.9] max-[820.001px]:max-w-[460px]">
                  Administra tus locales y asigna al personal de cada uno desde
                  el mismo panel.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-[20px] max-[820.001px]:gap-[15px]">
              <span
                className={`
        fw-locations-step-number [flex:0_0_33px] h-[33px] grid place-items-center
        [border:1px_solid_var(--fw-border)] rounded-full text-[color:var(--fw-blue)] text-[10px]
        font-extrabold [background:var(--fw-surface)]
      `}
              >
                03
              </span>
              <div>
                <h3 className="mb-[10px] text-[17px] leading-[1.45] tracking-[-0.5px]">
                  Más lugares para volver.
                </h3>
                <p className="max-w-[320px] [color:var(--fw-muted)] text-[12px] leading-[1.9] max-[820.001px]:max-w-[460px]">
                  Los sellos acompañan al cliente entre los locales de tu marca.
                  Tú defines la recompensa.
                </p>
              </div>
            </li>
          </ol>
          <a
            className={`
        fw-locations-cta [&:hover_>_span]:[transform:translate(3px,_-3px)]
        [&:hover_>_span]:[background:var(--fw-soft)] inline-flex items-center gap-[20px]
        text-[color:var(--fw-blue)] text-[12px] font-extrabold
      `}
            href="#contacto"
          >
            Conectemos tus sucursales{" "}
            <span
              className={`
        grid place-items-center w-[34px] h-[34px] [border:1px_solid_var(--fw-border)] rounded-full
        [transition:transform_0.25s_ease,_background_0.25s_ease]
        group-data-[reduced-motion=true]/home:[animation:none]!
        group-data-[reduced-motion=true]/home:[transition:none]!
      `}
              aria-hidden="true"
            >
              ↗
            </span>
          </a>
        </div>

        <div
          className={`
        fw-locations-sticky
        [&[data-motion=paused]_:is(.fw-map-route-flow,_.fw-map-river-line,_.fw-map-pin-ripple)]:[animation-play-state:paused]
        group-data-[reduced-motion=true]/home:[&_*]:[animation:none]!
        group-data-[reduced-motion=true]/home:[&_*]:[transition:none]! sticky top-[150px] py-[24px]
        w-[min(100%,_calc((100svh_-_455px)_*_1.44))] [justify-self:center] [perspective:1400px]
        max-[1100.001px]:top-[125px] max-[820.001px]:relative max-[820.001px]:top-[auto]
        max-[820.001px]:w-[min(100%,_580px)] max-[820.001px]:[align-self:center]
        max-[820.001px]:[padding-block:12px_0] max-[820.001px]:[perspective:none]
        [@media((max-height:_740px)_and_(min-width:_821px))]:top-[105px]
        [@media((max-height:_740px)_and_(min-width:_821px))]:w-[min(100%,_calc((100svh_-_370px)_*_1.44))]
        [@media((max-height:_600px)_and_(min-width:_821px))]:relative
        [@media((max-height:_600px)_and_(min-width:_821px))]:top-[auto]
        [@media((max-height:_600px)_and_(min-width:_821px))]:w-[100%]
      `}
          role="group"
          aria-label="Mapa interactivo de sucursales"
          ref={mapRef}
          data-motion={!staticMotion && inView ? "running" : "paused"}
        >
          <motion.div
            className={`
        fw-location-map-card relative [border:1px_solid_var(--fw-border)] rounded-[26px] isolate
        [background:var(--fw-surface)] [box-shadow:0_30px_70px_-28px_#2f455735,_0_4px_16px_#2f45570a]
        [transform-origin:center_65%] max-[820.001px]:transform-none! max-[480.001px]:rounded-[19px]
        group-data-[reduced-motion=true]/home:transform-none!
      `}
            style={staticMotion ? {} : { rotateX, rotateZ, y }}
          >
            <div
              className={`
        fw-location-map-header p-[22px_24px] flex justify-between items-center gap-[16px]
        max-[1100.001px]:[padding-inline:18px] max-[1100.001px]:gap-[8px] max-[480.001px]:p-[17px_14px]
        [@media((max-height:_740px)_and_(min-width:_821px))]:[padding-block:15px]
      `}
            >
              <span
                className={`
        fw-location-map-brand [&_>_svg]:w-[20px] [&_>_svg]:h-[20px] [&_>_svg]:[color:var(--fw-blue)]
        max-[480.001px]:[&_>_svg]:w-[17px] max-[480.001px]:[&_>_svg]:h-[17px] flex items-center gap-[9px]
        text-[13px] font-extrabold tracking-[-0.35px] max-[1100.001px]:text-[11px]
        max-[480.001px]:gap-[6px] max-[480.001px]:text-[11px]
      `}
              >
                <LocationIcon aria-hidden="true" /> Tu marca, cerca.
              </span>
              <span
                className={`
        fw-location-map-example text-[9px] text-[color:var(--fw-muted)] p-[5px_9px]
        [border:1px_solid_var(--fw-border)] rounded-[30px] whitespace-nowrap max-[1100.001px]:text-[8px]
        max-[480.001px]:text-[7px] max-[480.001px]:p-[4px_7px]
      `}
              >
                Mapa de ejemplo
              </span>
            </div>
            <BranchMap branchIndex={branchIndex} onSelect={setBranchIndex} />
            <div
              className={`
        fw-location-map-bottom p-[20px_24px_23px] max-[1100.001px]:[padding-inline:18px]
        max-[480.001px]:p-[16px_14px_18px]
        [@media((max-height:_740px)_and_(min-width:_821px))]:[padding-block:14px]
      `}
            >
              <BranchSelector
                branchIndex={branchIndex}
                onSelect={setBranchIndex}
              />
              <BranchDetail branch={branch} />
            </div>
          </motion.div>
          <p
            className={`
        fw-location-map-caption text-center text-[color:var(--fw-muted)] text-[10px] mt-[25px]!
        max-[820.001px]:mt-[18px]! max-[480.001px]:[padding-inline:12px] max-[480.001px]:text-[9px]
      `}
          >
            Toca un local y explora. Tu próxima sucursal también puede estar
            aquí.
          </p>
        </div>
      </HomeContainer>
    </section>
  );
}
