import type { LocationsStoryProps } from "../types/homeComponent.types.ts";
import { BRANCHES } from "../constants/locations.constants.ts";
import { HomeContainer } from "./HomeContainer";
import LocationsMap from "../../../../assets/home/locations-map.svg?react";
import LocationIcon from "../../../../assets/home/location.svg?react";
import { useRef, useState } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

export function LocationsStory({
  motionPaused = false,
}: LocationsStoryProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
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
      <HomeContainer className={`
        fw-locations-layout grid [grid-template-columns:minmax(0,_0.83fr)_minmax(0,_1.17fr)] items-start
        gap-[74px] min-h-[auto] max-[1100.001px]:gap-[40px]
        max-[1100.001px]:[grid-template-columns:minmax(0,_0.9fr)_minmax(0,_1.1fr)]
        max-[1100.001px]:min-h-[auto] max-[820.001px]:flex max-[820.001px]:flex-col
        max-[820.001px]:min-h-[auto] max-[820.001px]:gap-[28px]
        [@media((max-height:_600px)_and_(min-width:_821px))]:min-h-[auto]
      `}>
        <div className="fw-locations-copy [padding-block:32px_52px] max-[820.001px]:[padding-block:0]">
          <div className={`
            fw-locations-intro [&_>_p]:max-w-[360px] [&_>_p]:mt-[26px] [&_>_p]:[color:var(--fw-muted)]
            [&_>_p]:text-[14px] [&_>_p]:leading-[1.85] max-[820.001px]:[&_>_p]:max-w-[470px]
          `}>
            <span className={`
              fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold tracking-[0.16em]
              mb-[17px] max-[700.001px]:text-[8px] max-[700.001px]:mb-[14px]
            `}>
              UNA MARCA. MUCHOS PUNTOS DE ENCUENTRO.
            </span>
            <h2 id="fw-locations-title">
              En cada esquina,
              <br />
              <span className="fw-blue-text text-[color:var(--fw-blue)]">
                la misma conexión.
              </span>
            </h2>
            <p>
              Tu negocio puede estar en más de un lugar. La experiencia de tus
              clientes sigue siendo una sola.
            </p>
          </div>
          <ol className={`
            fw-locations-steps [&_li]:flex [&_li]:items-start [&_li]:gap-[20px] [&_h3]:mb-[10px]
            [&_h3]:text-[17px] [&_h3]:leading-[1.45] [&_h3]:tracking-[-0.5px] [&_p]:max-w-[320px]
            [&_p]:[color:var(--fw-muted)] [&_p]:text-[12px] [&_p]:leading-[1.9]
            max-[820.001px]:[&_li]:gap-[15px] max-[820.001px]:[&_p]:max-w-[460px] grid
            gap-[clamp(42px,_6vh,_80px)] list-none p-0 m-[80px_0_48px] max-[820.001px]:mt-[38px]
            max-[820.001px]:mb-[30px] max-[820.001px]:gap-[24px]
          `}>
            <li>
              <span className={`
                fw-locations-step-number [flex:0_0_33px] h-[33px] grid place-items-center
                [border:1px_solid_var(--fw-border)] rounded-full text-[color:var(--fw-blue)] text-[10px]
                font-extrabold [background:var(--fw-surface)]
              `}>
                01
              </span>
              <div>
                <h3>Pon tus locales en el mapa.</h3>
                <p>
                  Agrega sus direcciones y ubicaciones. Cada sucursal tiene su
                  lugar dentro de tu marca.
                </p>
              </div>
            </li>
            <li>
              <span className={`
                fw-locations-step-number [flex:0_0_33px] h-[33px] grid place-items-center
                [border:1px_solid_var(--fw-border)] rounded-full text-[color:var(--fw-blue)] text-[10px]
                font-extrabold [background:var(--fw-surface)]
              `}>
                02
              </span>
              <div>
                <h3>Un equipo, bien conectado.</h3>
                <p>
                  Administra tus locales y asigna al personal de cada uno desde
                  el mismo panel.
                </p>
              </div>
            </li>
            <li>
              <span className={`
                fw-locations-step-number [flex:0_0_33px] h-[33px] grid place-items-center
                [border:1px_solid_var(--fw-border)] rounded-full text-[color:var(--fw-blue)] text-[10px]
                font-extrabold [background:var(--fw-surface)]
              `}>
                03
              </span>
              <div>
                <h3>Más lugares para volver.</h3>
                <p>
                  Los sellos acompañan al cliente entre los locales de tu marca.
                  Tú defines la recompensa.
                </p>
              </div>
            </li>
          </ol>
          <a
            className={`
              fw-locations-cta [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:w-[34px]
              [&_>_span]:h-[34px] [&_>_span]:[border:1px_solid_var(--fw-border)] [&_>_span]:rounded-full
              [&_>_span]:[transition:transform_0.25s_ease,_background_0.25s_ease]
              [&:hover_>_span]:[transform:translate(3px,_-3px)] [&:hover_>_span]:[background:var(--fw-soft)]
              motion-reduce:[&_>_span]:[animation:none]! motion-reduce:[&_>_span]:[transition:none]! inline-flex
              items-center gap-[20px] text-[color:var(--fw-blue)] text-[12px] font-extrabold
            `}
            href="#contacto"
          >
            Conectemos tus sucursales <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div
          className={`
            fw-locations-sticky
            [&[data-motion=paused]_:is(.fw-map-route-flow,_.fw-map-river-line,_.fw-map-pin-ripple)]:[animation-play-state:paused]
            motion-reduce:[&_*]:[animation:none]! motion-reduce:[&_*]:[transition:none]! sticky top-[150px]
            py-[24px] w-[min(100%,_calc((100svh_-_455px)_*_1.44))] [justify-self:center] [perspective:1400px]
            max-[1100.001px]:top-[125px] max-[820.001px]:relative max-[820.001px]:top-[auto]
            max-[820.001px]:w-[min(100%,_580px)] max-[820.001px]:[align-self:center]
            max-[820.001px]:[padding-block:12px_0] max-[820.001px]:[perspective:none]
            [@media((max-height:_740px)_and_(min-width:_821px))]:top-[105px]
            [@media((max-height:_740px)_and_(min-width:_821px))]:w-[min(100%,_calc((100svh_-_370px)_*_1.44))]
            [@media((max-height:_600px)_and_(min-width:_821px))]:relative
            [@media((max-height:_600px)_and_(min-width:_821px))]:top-[auto]
            [@media((max-height:_600px)_and_(min-width:_821px))]:w-[100%]
          `}
          ref={mapRef}
          data-motion={!staticMotion && inView ? "running" : "paused"}
        >
          <motion.div
            className={`
              fw-location-map-card relative [border:1px_solid_var(--fw-border)] rounded-[26px] isolate
              [background:var(--fw-surface)] [box-shadow:0_30px_70px_-28px_#2f455735,_0_4px_16px_#2f45570a]
              [transform-origin:center_65%] max-[820.001px]:transform-none! max-[480.001px]:rounded-[19px]
              motion-reduce:transform-none!
            `}
            style={staticMotion ? {} : { rotateX, rotateZ, y }}
          >
            <div className={`
              fw-location-map-header p-[22px_24px] flex justify-between items-center gap-[16px]
              max-[1100.001px]:[padding-inline:18px] max-[1100.001px]:gap-[8px] max-[480.001px]:p-[17px_14px]
              [@media((max-height:_740px)_and_(min-width:_821px))]:[padding-block:15px]
            `}>
              <span className={`
                fw-location-map-brand [&_>_svg]:w-[20px] [&_>_svg]:h-[20px] [&_>_svg]:[color:var(--fw-blue)]
                max-[480.001px]:[&_>_svg]:w-[17px] max-[480.001px]:[&_>_svg]:h-[17px] flex items-center gap-[9px]
                text-[13px] font-extrabold tracking-[-0.35px] max-[1100.001px]:text-[11px] max-[480.001px]:gap-[6px]
                max-[480.001px]:text-[11px]
              `}>
                <LocationIcon aria-hidden="true" /> Tu marca, cerca.
              </span>
              <span className={`
                fw-location-map-example text-[9px] text-[color:var(--fw-muted)] p-[5px_9px]
                [border:1px_solid_var(--fw-border)] rounded-[30px] whitespace-nowrap max-[1100.001px]:text-[8px]
                max-[480.001px]:text-[7px] max-[480.001px]:p-[4px_7px]
              `}>
                Mapa de ejemplo
              </span>
            </div>
            <div className={`
              fw-location-map-scene relative [aspect-ratio:720_/_500] w-full
              [border-block:1px_solid_var(--fw-border)] overflow-hidden [background:var(--fw-soft)]
            `}>
              <LocationsMap className={`
                fw-location-map-art [&_.fw-map-land]:[fill:#edf1f3] [&_.fw-map-blocks]:[fill:#dce4e9]
                [&_.fw-map-blocks]:[stroke:#d1dce4] [&_.fw-map-blocks]:[stroke-width:1]
                [&_.fw-map-streets]:[stroke:#f9fbfc] [&_.fw-map-park]:[fill:#d7e5d7]
                [&_.fw-map-trees]:[fill:#a9c7b1] [&_.fw-map-street-label]:[fill:#79909e]
                [&_.fw-map-route-base]:[stroke:#087bd7] [&_.fw-map-route-flow]:[stroke:#087bd7]
                [&_.fw-map-route-flow]:[animation:fw-map-travel_16s_linear_infinite]
                [&_.fw-map-river-line]:[animation:fw-map-travel_32s_linear_infinite]
                dark:[&_.fw-map-land]:[fill:#142736] dark:[&_.fw-map-blocks]:[fill:#1c3546]
                dark:[&_.fw-map-blocks]:[stroke:#254354] dark:[&_.fw-map-streets]:[stroke:#0d1d29]
                dark:[&_.fw-map-park]:[fill:#29483f] dark:[&_.fw-map-trees]:[fill:#3c6552]
                dark:[&_.fw-map-route-flow]:[stroke:#54b0f2] dark:[&_.fw-map-route-base]:[stroke:#54b0f2]
                dark:[&_.fw-map-street-label]:[fill:#6b92a7] block w-full h-full
              `} />
              {BRANCHES.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className={`
                    fw-map-pin [&:hover_.fw-map-pin-head]:[transform:translateY(-5px)] [&.is-selected]:z-[3]
                    [&.is-selected_.fw-map-pin-head]:[color:white]
                    [&.is-selected_.fw-map-pin-head]:[border-color:#ffffff70]
                    [&.is-selected_.fw-map-pin-head]:[background:#087bd7]
                    [&.is-selected_.fw-map-pin-head]:[transform:translateY(-4px)]
                    [&.is-selected_.fw-map-pin-head]:[box-shadow:0_8px_22px_#087bd742]
                    [&.is-selected_.fw-map-pin-ripple]:[animation:fw-map-pulse_3.5s_ease-out_infinite] absolute w-[56px]
                    h-[72px] p-0 [border:0] flex flex-col items-center justify-center z-[2] text-[#087bd7]
                    [transform:translate(-50%,_-62%)] [background:none] max-[480.001px]:w-[48px]
                    max-[480.001px]:h-[62px]
                  ${branchIndex === index ? " is-selected" : ""}`}
                  style={{ left: `${item.x}%`, top: `${item.y}%` }}
                  aria-label={`Ver sucursal ${item.name} en el mapa`}
                  aria-pressed={branchIndex === index}
                  aria-controls="fw-branch-detail"
                  onClick={() => setBranchIndex(index)}
                >
                  <span
                    className={`
                      fw-map-pin-ripple absolute w-[40px] h-[15px] left-[8px] top-[49px] [border:1px_solid_#087bd7]
                      rounded-full opacity-0 z-[-1] dark:[border-color:#54b0f2] max-[480.001px]:left-[4px]
                      max-[480.001px]:top-[42px]
                    `}
                    aria-hidden="true"
                  />
                  <span className={`
                    fw-map-pin-head [&_svg]:w-[23px] [&_svg]:h-[23px] max-[480.001px]:[&_svg]:w-[20px]
                    max-[480.001px]:[&_svg]:h-[20px] grid place-items-center w-[43px] h-[43px]
                    [border:1px_solid_#087bd724] rounded-[14px] [background:#fff] [box-shadow:0_8px_20px_#2f455727]
                    [transition:transform_0.35s_cubic-bezier(0.22,_0.68,_0,_1.4),_background_0.2s,_color_0.2s]
                    dark:[color:#81c5f5] dark:[border-color:#558bb440] dark:[background:#203b50]
                    max-[480.001px]:w-[34px] max-[480.001px]:h-[34px] max-[480.001px]:rounded-[11px]
                  `}>
                    <LocationIcon aria-hidden="true" />
                  </span>
                  <span className={`
                    fw-map-pin-name text-[9px] leading-[1.4] font-extrabold text-[#2f4557] p-[3px_7px] rounded-[6px]
                    mt-[3px] [background:#fffffff0] [box-shadow:0_2px_5px_#2f45570d] dark:[color:#c7dbe9]
                    dark:[border-color:#558bb440] dark:[background:#172d3eea] max-[480.001px]:text-[8px]
                    max-[480.001px]:p-[2px_6px]
                  `}>
                    {item.name}
                  </span>
                </button>
              ))}
              <div
                className={`
                  fw-map-compass [&_span]:text-[8px] [&_span]:font-[800] absolute top-[13px] right-[14px] grid
                  place-items-center leading-[1.2] text-[#698296] text-[24px] max-[480.001px]:text-[18px]
                  max-[480.001px]:right-[10px] max-[480.001px]:top-[9px]
                `}
                aria-hidden="true"
              >
                <span>N</span>↑
              </div>
              <div
                className={`
                  fw-map-network [&_>_span]:block [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:rounded-full
                  [&_>_span]:[background:#d69e09] [&_>_span]:[box-shadow:0_0_0_3px_#d69e0920] absolute left-[20px]
                  bottom-[14px] flex items-center gap-[7px] p-[8px_10px] [border:1px_solid_#fff] rounded-[10px]
                  text-[#2f4557] text-[9px] font-[750] [background:#ffffffe8] [box-shadow:0_3px_16px_#2f45570d]
                  dark:[color:#c7dbe9] dark:[border-color:#558bb440] dark:[background:#172d3eea]
                  max-[480.001px]:left-[10px] max-[480.001px]:bottom-[9px] max-[480.001px]:p-[5px_7px]
                  max-[480.001px]:text-[7px]
                `}
                aria-hidden="true"
              >
                <span /> Una tarjeta. Tres destinos.
              </div>
            </div>
            <div className={`
              fw-location-map-bottom p-[20px_24px_23px] max-[1100.001px]:[padding-inline:18px]
              max-[480.001px]:p-[16px_14px_18px]
              [@media((max-height:_740px)_and_(min-width:_821px))]:[padding-block:14px]
            `}>
              <div
                className={`
                  fw-branch-selector [&_button]:flex [&_button]:justify-center [&_button]:items-center
                  [&_button]:gap-[7px] [&_button]:p-[9px_6px] [&_button]:min-h-[40px]
                  [&_button]:[border:1px_solid_var(--fw-border)] [&_button]:[color:var(--fw-muted)]
                  [&_button]:rounded-[10px] [&_button]:text-[10px] [&_button]:font-[750]
                  [&_button]:[background:transparent]
                  [&_button]:[transition:background_0.2s_ease,_border-color_0.2s_ease,_color_0.2s_ease]
                  [&_button_>_span]:text-[8px] [&_button_>_span]:[opacity:0.6]
                  [&_button[aria-pressed=true]]:[color:var(--fw-blue)]
                  [&_button[aria-pressed=true]]:[border-color:color-mix(in_srgb,_var(--fw-blue)_30%,_transparent)]
                  [&_button[aria-pressed=true]]:[background:color-mix(in_srgb,_var(--fw-blue)_9%,_transparent)]
                  [&_button:hover]:[border-color:var(--fw-blue)] max-[480.001px]:[&_button]:text-[9px]
                  max-[480.001px]:[&_button]:gap-[4px] max-[480.001px]:[&_button]:[padding-inline:4px] grid
                  [grid-template-columns:repeat(3,_1fr)] gap-[8px] max-[480.001px]:gap-[6px]
                `}
                role="group"
                aria-label="Explora las sucursales de ejemplo"
              >
                {BRANCHES.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    aria-pressed={branchIndex === index}
                    aria-controls="fw-branch-detail"
                    onClick={() => setBranchIndex(index)}
                  >
                    <span>{item.number}</span> {item.name}
                  </button>
                ))}
              </div>
              <div
                className={`
                  fw-branch-detail [&_>_div]:min-w-[0] [&_strong]:block [&_strong]:text-[11px]
                  [&_strong]:leading-[1.7] [&_strong]:font-[800] [&_>_div_>_span]:block
                  [&_>_div_>_span]:[color:var(--fw-muted)] [&_>_div_>_span]:text-[9px] [&_>_div_>_span]:leading-[1.7]
                  max-[480.001px]:[&_strong]:text-[10px] max-[480.001px]:[&_>_div_>_span]:text-[8px] flex items-center
                  gap-[12px] mt-[22px] min-h-[40px] max-[480.001px]:gap-[9px] max-[480.001px]:mt-[16px]
                  [@media((max-height:_740px)_and_(min-width:_821px))]:mt-[12px]
                `}
                id="fw-branch-detail"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className={`
                  fw-branch-detail-icon [&_svg]:w-[18px] [&_svg]:h-[18px] grid [flex:0_0_35px] h-[35px]
                  place-items-center rounded-[10px] text-[#b88100] [background:#d69e0915]
                  max-[480.001px]:[flex-basis:29px] max-[480.001px]:h-[32px]
                `}>
                  <LocationIcon aria-hidden="true" />
                </span>
                <div>
                  <strong>Café Esquina · {branch.name}</strong>
                  <span>{branch.address} · Dirección de ejemplo</span>
                </div>
                <span
                  className="fw-branch-detail-arrow ml-[auto] text-[22px] text-[color:var(--fw-muted)] max-[480.001px]:hidden"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </div>
            </div>
          </motion.div>
          <p className={`
            fw-location-map-caption text-center text-[color:var(--fw-muted)] text-[10px] mt-[25px]!
            max-[820.001px]:mt-[18px]! max-[480.001px]:[padding-inline:12px] max-[480.001px]:text-[9px]
          `}>
            Toca un local y explora. Tu próxima sucursal también puede estar
            aquí.
          </p>
        </div>
      </HomeContainer>
    </section>
  );
}
