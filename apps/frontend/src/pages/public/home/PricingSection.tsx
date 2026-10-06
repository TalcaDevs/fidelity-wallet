import { useState } from "react";
import { CATALOG_PLANS, type Plan } from "@fidelity/shared";
import "./PricingSection.css";

const PAID_PLANS = CATALOG_PLANS.filter((plan) => plan.id !== "TRIAL");
const TRIAL_PLAN = CATALOG_PLANS.find((plan) => plan.id === "TRIAL");
const PLAN_STORIES: Record<string, { title: string; description: string }> = {
  STARTER: {
    title: "Tu primera comunidad.",
    description:
      "Empieza a reconocer a quienes vuelven y convierte las visitas en una relación.",
  },
  PRO: {
    title: "Más equipo. Más conexión.",
    description:
      "Dale espacio a tu operación para crecer, con más locales y personas conectadas.",
  },
  BUSINESS: {
    title: "Una marca que crece contigo.",
    description:
      "Coordina una red de locales y mantén a todo tu equipo en la misma página.",
  },
};

function capacityOptions(key: "locations" | "teamUsers") {
  const limits = [...new Set(PAID_PLANS.map((plan) => plan.limits[key]))].sort(
    (a, b) => a - b,
  );
  let previous = 0;
  return limits.map((limit) => {
    const minimum = previous + 1;
    previous = limit;
    return {
      value: limit,
      label: minimum === limit ? String(limit) : `${minimum} a ${limit}`,
    };
  });
}

const LOCATION_OPTIONS = capacityOptions("locations");
const TEAM_OPTIONS = capacityOptions("teamUsers");
const MAX_LOCATIONS = Math.max(
  ...PAID_PLANS.map((plan) => plan.limits.locations),
);
const MAX_TEAM = Math.max(...PAID_PLANS.map((plan) => plan.limits.teamUsers));
const countLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m4 10 4 4 8-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10h12m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlanCard({
  plan,
  annual,
  recommended,
}: {
  plan: Plan;
  annual: boolean;
  recommended: boolean;
}) {
  const annualPrice = annual ? plan.priceUsdMonthlyAnnual : null;
  const price = annualPrice ?? plan.priceUsdMonthly;
  const story = PLAN_STORIES[plan.id] ?? {
    title: plan.tagline,
    description: plan.tagline,
  };
  const benefits = getPlanBenefits(plan);

  return (
    <article
      className={`fw-price-card${recommended ? " is-recommended" : ""}`}
      aria-labelledby={`plan-${plan.id}`}
    >
      <div className="fw-price-card-top">
        <span className="fw-price-index">{plan.name}</span>
        <span className={`fw-price-badge${recommended ? "" : " is-empty"}`}>
          {recommended ? "PARA TU NEGOCIO" : "\u00a0"}
        </span>
      </div>
      <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
      <p className="fw-price-story">{story.title}</p>
      <div className="fw-price-amount" aria-label={`USD ${price} por mes`}>
        <span>USD</span>
        <strong>{price}</strong>
        <span>/ mes</span>
      </div>
      <p className="fw-price-period">
        {annualPrice === null
          ? "Referencia con modalidad mensual"
          : `USD ${annualPrice * 12} por año · pago anual`}
      </p>
      <p className="fw-price-description">{story.description}</p>
      <a
        className={`fw-button fw-price-cta${recommended ? " fw-price-cta-primary" : ""}`}
        href="#contacto"
        aria-label={`Consultar por el plan ${plan.name}`}
      >
        Hablemos de {plan.name}
        <Arrow />
      </a>
      <span className="fw-price-list-label">LO QUE PUEDES HACER</span>
      <ul>
        {benefits.map((benefit) => (
          <li key={benefit}>
            <Check />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PricingSection({
  motionPaused = false,
}: {
  motionPaused?: boolean;
}) {
  const [annual, setAnnual] = useState(false);
  const [locations, setLocations] = useState(LOCATION_OPTIONS[0].value);
  const [teamUsers, setTeamUsers] = useState(TEAM_OPTIONS[0].value);
  const recommendation = [...PAID_PLANS]
    .sort((a, b) => a.priceUsdMonthly - b.priceUsdMonthly)
    .find(
      (plan) =>
        plan.limits.locations >= locations &&
        plan.limits.teamUsers >= teamUsers,
    );

  return (
    <section
      className="fw-pricing"
      id="planes"
      aria-labelledby="pricing-title"
      data-motion-paused={motionPaused}
    >
      <div className="fw-container fw-section">
        <div className="fw-section-heading fw-pricing-heading">
          <div>
            <span className="fw-section-label">
              UN PLAN PARA TU PRÓXIMA ETAPA
            </span>
            <h2 id="pricing-title">
              Empieza pequeño.
              <br />
              Haz crecer la relación
              <span className="fw-gold-text" aria-hidden="true">
                .
              </span>
            </h2>
          </div>
          <p>
            Elige el espacio que necesita tu negocio.
            <br />
            Nosotros te ayudamos a dar el primer paso.
          </p>
        </div>

        <div className="fw-plan-finder">
          <div className="fw-plan-finder-intro">
            <span className="fw-plan-finder-icon" aria-hidden="true">
              ✳
            </span>
            <div>
              <h3>Encuentra tu punto de partida</h3>
              <p>Cuéntanos el tamaño de tu operación.</p>
            </div>
          </div>
          <div className="fw-plan-fields">
            <label htmlFor="plan-locations">
              Locales
              <select
                id="plan-locations"
                value={locations}
                onChange={(event) => setLocations(Number(event.target.value))}
              >
                {LOCATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {option.value === 1 ? "local" : "locales"}
                  </option>
                ))}
                <option value={MAX_LOCATIONS + 1}>
                  Más de {MAX_LOCATIONS} locales
                </option>
              </select>
            </label>
            <label htmlFor="plan-team">
              Colaboradores
              <select
                id="plan-team"
                value={teamUsers}
                onChange={(event) => setTeamUsers(Number(event.target.value))}
              >
                {TEAM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {option.value === 1 ? "persona" : "personas"}
                  </option>
                ))}
                <option value={MAX_TEAM + 1}>Más de {MAX_TEAM} personas</option>
              </select>
            </label>
          </div>
          <div
            className="fw-plan-recommendation"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{recommendation ? "TE SUGERIMOS" : "CREZCAMOS JUNTOS"}</span>
            <strong>
              {recommendation
                ? recommendation.name
                : "Hablemos de tu operación"}
            </strong>
            <p>
              {recommendation
                ? "Según tus locales y equipo."
                : "Revisemos una opción para tu equipo."}
            </p>
          </div>
        </div>
        <div className="fw-pricing-toolbar">
          <p>Tu acceso como dueño no ocupa un cupo del equipo.</p>
          <div
            className="fw-billing-switch"
            role="group"
            aria-label="Modalidad de precio"
          >
            {[false, true].map((isAnnual) => (
              <button
                key={String(isAnnual)}
                type="button"
                aria-pressed={annual === isAnnual}
                onClick={() => setAnnual(isAnnual)}
              >
                {isAnnual ? "Anual" : "Mensual"}
              </button>
            ))}
          </div>
        </div>
        <div className="fw-price-grid">
          {PAID_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              annual={annual}
              recommended={recommendation?.id === plan.id}
            />
          ))}
        </div>

        {TRIAL_PLAN && (
          <article
            className="fw-price-trial"
            aria-labelledby="trial-plan-title"
          >
            <div className="fw-trial-symbol" aria-hidden="true">
              <Check />
            </div>
            <div className="fw-trial-copy">
              <span className="fw-price-list-label">PRIMERO, CONÓCENOS</span>
              <h3 id="trial-plan-title">
                {TRIAL_PLAN.name}: {TRIAL_PLAN.trialDays} días para dar el
                primer paso.
              </h3>
              <p>
                Hasta {TRIAL_PLAN.limits.customers} clientes ·{" "}
                {countLabel(TRIAL_PLAN.limits.locations, "local", "locales")} ·{" "}
                {countLabel(
                  TRIAL_PLAN.limits.teamUsers,
                  "colaborador",
                  "colaboradores",
                )}{" "}
                · Sin tarjeta de pago.
              </p>
            </div>
            <div className="fw-trial-price">
              <strong>USD {TRIAL_PLAN.priceUsdMonthly}</strong>
              <span>durante la prueba</span>
            </div>
            <a
              className="fw-button fw-price-cta"
              href="#contacto"
              aria-label={`Consultar por la ${TRIAL_PLAN.name.toLowerCase()}`}
            >
              Quiero conocerlo
              <Arrow />
            </a>
          </article>
        )}

        <details className="fw-price-details">
          <summary>
            <span>Qué incluye cada etapa</span>
            <span aria-hidden="true">+</span>
          </summary>
          <div className="fw-price-detail-grid">
            <div>
              <h3>Una base para conectar</h3>
              <p>
                Todos los planes contemplan tarjetas digitales en Wallet. La
                prueba permite conocer la experiencia con un grupo de hasta{" "}
                {TRIAL_PLAN?.limits.customers} clientes.
              </p>
            </div>
            <div>
              <h3>Más espacio para tu negocio</h3>
              <p>
                Los planes de pago amplían la capacidad de tu equipo y tus
                locales, con clientes ilimitados. Las tarjetas, los premios y la
                experiencia mantienen la identidad de tu marca.
              </p>
            </div>
            <div>
              <h3>Detalles que afinamos contigo</h3>
              <p>
                Revisamos la configuración, las funciones y la disponibilidad de
                las billeteras para tu negocio antes de activar el servicio.
              </p>
            </div>
          </div>
        </details>
        <p className="fw-price-reference">
          Precios referenciales en USD, sujetos a confirmación. La modalidad
          anual considera el pago del año completo. Conversemos para confirmar
          tu plan, las funciones disponibles y las condiciones de contratación.
        </p>
      </div>
    </section>
  );
}

function getPlanBenefits(plan: Plan) {
  return [
    `Hasta ${countLabel(plan.limits.locations, "local", "locales")}`,
    `Hasta ${countLabel(plan.limits.teamUsers, "colaborador", "colaboradores")}`,
    plan.limits.customers === null
      ? "Clientes ilimitados"
      : `Hasta ${plan.limits.customers} clientes`,
    ...(plan.features.walletPasses ? ["Tarjetas digitales en Wallet"] : []),
    ...(plan.features.advancedMetrics
      ? ["Métricas para conocer a tus clientes"]
      : []),
    ...(plan.features.excelExport ? ["Exportación a Excel"] : []),
  ];
}
