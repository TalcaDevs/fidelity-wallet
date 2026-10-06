import { HomeContainer } from "./HomeContainer";
import LocationsMap from "../../../assets/home/locations-map.svg?react";
import LocationIcon from "../../../assets/home/location.svg?react";
import { useRef, useState } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import "./LocationsStory.css";

const BRANCHES = [
  { name: "Centro", address: "Paseo del Café 120", x: 27, y: 44, number: "01" },
  { name: "Parque", address: "Av. del Parque 450", x: 63, y: 26, number: "02" },
  { name: "Ribera", address: "Costanera 280", x: 71, y: 68, number: "03" },
] as const;

export function LocationsStory({
  motionPaused = false,
}: {
  motionPaused?: boolean;
}) {
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
      className="fw-locations relative fw-section py-[100px]"
      id="sucursales"
      ref={sectionRef}
      aria-labelledby="fw-locations-title"
    >
      <HomeContainer className="fw-locations-layout grid [grid-template-columns:minmax(0,_0.83fr)_minmax(0,_1.17fr)] items-start gap-[74px] min-h-[auto]">
        <div className="fw-locations-copy [padding-block:32px_52px]">
          <div className="fw-locations-intro">
            <span className="fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold tracking-[0.16em] mb-[17px]">
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
          <ol className="fw-locations-steps grid [gap:clamp(42px,_6vh,_80px)] list-none p-0 [margin:80px_0_48px]">
            <li>
              <span className="fw-locations-step-number [flex:0_0_33px] h-[33px] grid place-items-center [border:1px_solid_var(--fw-border)] rounded-full text-[color:var(--fw-blue)] text-[10px] font-extrabold">
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
              <span className="fw-locations-step-number [flex:0_0_33px] h-[33px] grid place-items-center [border:1px_solid_var(--fw-border)] rounded-full text-[color:var(--fw-blue)] text-[10px] font-extrabold">
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
              <span className="fw-locations-step-number [flex:0_0_33px] h-[33px] grid place-items-center [border:1px_solid_var(--fw-border)] rounded-full text-[color:var(--fw-blue)] text-[10px] font-extrabold">
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
            className="fw-locations-cta inline-flex items-center gap-[20px] text-[color:var(--fw-blue)] text-[12px] font-extrabold"
            href="#contacto"
          >
            Conectemos tus sucursales <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div
          className="fw-locations-sticky sticky top-[150px] py-[24px] [width:min(100%,_calc((100svh_-_455px)_*_1.44))] [justify-self:center]"
          ref={mapRef}
          data-motion={!staticMotion && inView ? "running" : "paused"}
        >
          <motion.div
            className="fw-location-map-card relative [border:1px_solid_var(--fw-border)] rounded-[26px] isolate"
            style={staticMotion ? {} : { rotateX, rotateZ, y }}
          >
            <div className="fw-location-map-header [padding:22px_24px] flex justify-between items-center gap-[16px]">
              <span className="fw-location-map-brand flex items-center gap-[9px] text-[13px] font-extrabold tracking-[-0.35px]">
                <LocationIcon aria-hidden="true" /> Tu marca, cerca.
              </span>
              <span className="fw-location-map-example text-[9px] text-[color:var(--fw-muted)] [padding:5px_9px] [border:1px_solid_var(--fw-border)] rounded-[30px] whitespace-nowrap">
                Mapa de ejemplo
              </span>
            </div>
            <div className="fw-location-map-scene relative [aspect-ratio:720_/_500] w-full [border-block:1px_solid_var(--fw-border)] overflow-hidden">
              <LocationsMap className="fw-location-map-art block w-full h-full" />
              {BRANCHES.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className={`fw-map-pin absolute w-[56px] h-[72px] p-0 [border:0] flex flex-col items-center justify-center z-[2] text-[#087bd7]${branchIndex === index ? " is-selected" : ""}`}
                  style={{ left: `${item.x}%`, top: `${item.y}%` }}
                  aria-label={`Ver sucursal ${item.name} en el mapa`}
                  aria-pressed={branchIndex === index}
                  aria-controls="fw-branch-detail"
                  onClick={() => setBranchIndex(index)}
                >
                  <span
                    className="fw-map-pin-ripple absolute w-[40px] h-[15px] left-[8px] top-[49px] [border:1px_solid_#087bd7] rounded-full opacity-0 z-[-1]"
                    aria-hidden="true"
                  />
                  <span className="fw-map-pin-head grid place-items-center w-[43px] h-[43px] [border:1px_solid_#087bd724] rounded-[14px]">
                    <LocationIcon aria-hidden="true" />
                  </span>
                  <span className="fw-map-pin-name text-[9px] leading-[1.4] font-extrabold text-[#2f4557] [padding:3px_7px] rounded-[6px] mt-[3px]">
                    {item.name}
                  </span>
                </button>
              ))}
              <div
                className="fw-map-compass absolute top-[13px] right-[14px] grid place-items-center leading-[1.2] text-[#698296] text-[24px]"
                aria-hidden="true"
              >
                <span>N</span>↑
              </div>
              <div
                className="fw-map-network absolute left-[20px] bottom-[14px] flex items-center gap-[7px] [padding:8px_10px] [border:1px_solid_#fff] rounded-[10px] text-[#2f4557] text-[9px] font-[750]"
                aria-hidden="true"
              >
                <span /> Una tarjeta. Tres destinos.
              </div>
            </div>
            <div className="fw-location-map-bottom [padding:20px_24px_23px]">
              <div
                className="fw-branch-selector grid [grid-template-columns:repeat(3,_1fr)] gap-[8px]"
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
                className="fw-branch-detail flex items-center gap-[12px] mt-[22px] min-h-[40px]"
                id="fw-branch-detail"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="fw-branch-detail-icon grid [flex:0_0_35px] h-[35px] place-items-center rounded-[10px] text-[#b88100]">
                  <LocationIcon aria-hidden="true" />
                </span>
                <div>
                  <strong>Café Esquina · {branch.name}</strong>
                  <span>{branch.address} · Dirección de ejemplo</span>
                </div>
                <span
                  className="fw-branch-detail-arrow ml-[auto] text-[22px] text-[color:var(--fw-muted)]"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </div>
            </div>
          </motion.div>
          <p className="fw-location-map-caption text-center text-[color:var(--fw-muted)] text-[10px]">
            Toca un local y explora. Tu próxima sucursal también puede estar
            aquí.
          </p>
        </div>
      </HomeContainer>
    </section>
  );
}
