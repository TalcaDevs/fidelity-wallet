import { useId, useRef, useState } from "react";
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

function LocationIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

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
  const gradientId = `fw-map-water-${useId().replaceAll(":", "")}`;
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
      className="fw-locations fw-section"
      id="sucursales"
      ref={sectionRef}
      aria-labelledby="fw-locations-title"
    >
      <div className="fw-container fw-locations-layout">
        <div className="fw-locations-copy">
          <div className="fw-locations-intro">
            <span className="fw-section-label">
              UNA MARCA. MUCHOS PUNTOS DE ENCUENTRO.
            </span>
            <h2 id="fw-locations-title">
              En cada esquina,
              <br />
              <span className="fw-blue-text">la misma conexión.</span>
            </h2>
            <p>
              Tu negocio puede estar en más de un lugar. La experiencia de tus
              clientes sigue siendo una sola.
            </p>
          </div>
          <ol className="fw-locations-steps">
            <li>
              <span className="fw-locations-step-number">01</span>
              <div>
                <h3>Pon tus locales en el mapa.</h3>
                <p>
                  Agrega sus direcciones y ubicaciones. Cada sucursal tiene su
                  lugar dentro de tu marca.
                </p>
              </div>
            </li>
            <li>
              <span className="fw-locations-step-number">02</span>
              <div>
                <h3>Un equipo, bien conectado.</h3>
                <p>
                  Administra tus locales y asigna al personal de cada uno desde
                  el mismo panel.
                </p>
              </div>
            </li>
            <li>
              <span className="fw-locations-step-number">03</span>
              <div>
                <h3>Más lugares para volver.</h3>
                <p>
                  Los sellos acompañan al cliente entre los locales de tu marca.
                  Tú defines la recompensa.
                </p>
              </div>
            </li>
          </ol>
          <a className="fw-locations-cta" href="#contacto">
            Conectemos tus sucursales <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div
          className="fw-locations-sticky"
          ref={mapRef}
          data-motion={!staticMotion && inView ? "running" : "paused"}
        >
          <motion.div
            className="fw-location-map-card"
            style={staticMotion ? {} : { rotateX, rotateZ, y }}
          >
            <div className="fw-location-map-header">
              <span className="fw-location-map-brand">
                <LocationIcon /> Tu marca, cerca.
              </span>
              <span className="fw-location-map-example">Mapa de ejemplo</span>
            </div>
            <div className="fw-location-map-scene">
              <svg
                className="fw-location-map-art"
                viewBox="0 0 720 500"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="90"
                    y1="0"
                    x2="200"
                    y2="500"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#087BD7" stopOpacity=".2" />
                    <stop offset="1" stopColor="#087BD7" stopOpacity=".09" />
                  </linearGradient>
                </defs>
                <path className="fw-map-land" d="M0 0h720v500H0z" />
                <g className="fw-map-blocks">
                  <rect x="218" y="22" width="95" height="75" rx="14" />
                  <rect x="334" y="22" width="117" height="75" rx="14" />
                  <rect x="480" y="22" width="101" height="68" rx="14" />
                  <rect x="610" y="22" width="100" height="103" rx="14" />
                  <rect x="198" y="127" width="127" height="65" rx="14" />
                  <rect x="354" y="127" width="56" height="65" rx="14" />
                  <rect x="514" y="165" width="73" height="96" rx="14" />
                  <rect x="619" y="157" width="84" height="106" rx="14" />
                  <rect x="238" y="261" width="87" height="73" rx="14" />
                  <rect x="357" y="272" width="81" height="62" rx="14" />
                  <rect x="581" y="296" width="123" height="58" rx="14" />
                  <rect x="245" y="372" width="80" height="113" rx="14" />
                  <rect x="360" y="375" width="138" height="108" rx="14" />
                  <rect x="534" y="391" width="171" height="93" rx="14" />
                  <rect x="13" y="31" width="56" height="117" rx="14" />
                  <rect x="12" y="301" width="63" height="83" rx="14" />
                  <rect x="15" y="412" width="86" height="73" rx="14" />
                </g>
                <path
                  d="M130-35c98 112-72 190-9 286s35 174 67 285"
                  stroke={`url(#${gradientId})`}
                  strokeWidth="57"
                />
                <path
                  className="fw-map-river-line"
                  d="M130-35c98 112-72 190-9 286s35 174 67 285"
                  stroke="#087BD7"
                  strokeOpacity=".2"
                  strokeWidth="1.5"
                  strokeDasharray="12 12"
                />
                <g
                  className="fw-map-streets"
                  strokeWidth="15"
                  strokeLinecap="round"
                >
                  <path d="M0 220h378c53 0 65 14 78 39l59 95h205" />
                  <path d="M340 0v500M598 0v284M206 0v176M160 354h310" />
                  <path d="M173 112h420M156 247l48 253M463 0v185M463 290l58 210" />
                </g>
                <path
                  className="fw-map-park"
                  d="M451 151c35-3 64 20 62 55-2 44-35 63-68 51-28-10-45-45-31-72 9-18 20-31 37-34Z"
                />
                <path
                  d="M436 184c26-11 51 5 49 29-1 19-27 26-39 12"
                  stroke="#799C83"
                  strokeOpacity=".35"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <g className="fw-map-trees">
                  <circle cx="442" cy="173" r="10" />
                  <circle cx="475" cy="200" r="12" />
                  <circle cx="447" cy="236" r="8" />
                  <circle cx="271" cy="294" r="9" />
                  <circle cx="299" cy="294" r="9" />
                  <circle cx="643" cy="320" r="10" />
                  <circle cx="255" cy="54" r="8" />
                  <circle cx="525" cy="59" r="9" />
                  <circle cx="572" cy="436" r="9" />
                </g>
                <g
                  className="fw-map-route-base"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M194 220h146V112h114v18" />
                  <path d="M454 130v55c0 29 14 57 31 91l26 64" />
                  <path d="M194 220h146v134h135q20 0 36-14" />
                </g>
                <g
                  className="fw-map-route-flow"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="4 17"
                >
                  <path d="M194 220h146V112h114v18" />
                  <path d="M454 130v55c0 29 14 57 31 91l26 64" />
                  <path d="M194 220h146v134h135q20 0 36-14" />
                </g>
                <text x="231" y="214" className="fw-map-street-label">
                  PASEO DEL CAFÉ
                </text>
                <text x="387" y="409" className="fw-map-street-label">
                  BARRIO RIBERA
                </text>
                <text x="601" y="111" className="fw-map-street-label">
                  LA CIUDAD
                </text>
              </svg>
              {BRANCHES.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className={`fw-map-pin${branchIndex === index ? " is-selected" : ""}`}
                  style={{ left: `${item.x}%`, top: `${item.y}%` }}
                  aria-label={`Ver sucursal ${item.name} en el mapa`}
                  aria-pressed={branchIndex === index}
                  aria-controls="fw-branch-detail"
                  onClick={() => setBranchIndex(index)}
                >
                  <span className="fw-map-pin-ripple" aria-hidden="true" />
                  <span className="fw-map-pin-head">
                    <LocationIcon />
                  </span>
                  <span className="fw-map-pin-name">{item.name}</span>
                </button>
              ))}
              <div className="fw-map-compass" aria-hidden="true">
                <span>N</span>↑
              </div>
              <div className="fw-map-network" aria-hidden="true">
                <span /> Una tarjeta. Tres destinos.
              </div>
            </div>
            <div className="fw-location-map-bottom">
              <div
                className="fw-branch-selector"
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
                className="fw-branch-detail"
                id="fw-branch-detail"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="fw-branch-detail-icon">
                  <LocationIcon />
                </span>
                <div>
                  <strong>Café Esquina · {branch.name}</strong>
                  <span>{branch.address} · Dirección de ejemplo</span>
                </div>
                <span className="fw-branch-detail-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            </div>
          </motion.div>
          <p className="fw-location-map-caption">
            Toca un local y explora. Tu próxima sucursal también puede estar
            aquí.
          </p>
        </div>
      </div>
    </section>
  );
}
