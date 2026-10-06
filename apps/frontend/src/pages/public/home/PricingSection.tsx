import { HomeContainer } from "./HomeContainer";
import { SectionHeading } from "./SectionHeading";
import Arrow from "../../../assets/home/plan-arrow.svg?react";
import Check from "../../../assets/home/plan-check.svg?react";
import { useState } from "react";
import {
  PAID_PLANS,
  TRIAL_PLAN,
  LOCATION_OPTIONS,
  TEAM_OPTIONS,
  MAX_LOCATIONS,
  MAX_TEAM,
  countLabel,
  recommendPlan,
} from "./pricingModel";
import { PlanCard } from "./PlanCard";
import "./PricingSection.css";

export function PricingSection({
  motionPaused = false,
}: {
  motionPaused?: boolean;
}) {
  const [annual, setAnnual] = useState(false);
  const [locations, setLocations] = useState(LOCATION_OPTIONS[0].value);
  const [teamUsers, setTeamUsers] = useState(TEAM_OPTIONS[0].value);
  const recommendation = recommendPlan(PAID_PLANS, locations, teamUsers);

  return (
    <section
      className="fw-pricing [border-block:1px_solid_var(--fw-border)]"
      id="planes"
      aria-labelledby="pricing-title"
      data-motion-paused={motionPaused}
    >
      <HomeContainer className="fw-section py-[100px]">
        <SectionHeading
          id="pricing-title"
          label="UN PLAN PARA TU PRÓXIMA ETAPA"
          className="fw-pricing-heading items-end"
          title={
            <>
              Empieza pequeño.
              <br />
              Haz crecer la relación
              <span className="fw-gold-text text-[#d69e09]" aria-hidden="true">
                .
              </span>
            </>
          }
        >
          Elige el espacio que necesita tu negocio.
          <br />
          Nosotros te ayudamos a dar el primer paso.
        </SectionHeading>

        <div className="fw-plan-finder grid [grid-template-columns:1.1fr_1.2fr_0.8fr] items-center gap-[28px] [padding:25px_28px] [border:1px_solid_var(--fw-border)] rounded-[18px]">
          <div className="fw-plan-finder-intro flex gap-[14px] items-center">
            <span
              className="fw-plan-finder-icon text-[#a77600] text-[39px] leading-[1]"
              aria-hidden="true"
            >
              ✳
            </span>
            <div>
              <h3>Encuentra tu punto de partida</h3>
              <p>Cuéntanos el tamaño de tu operación.</p>
            </div>
          </div>
          <div className="fw-plan-fields flex items-center gap-[12px]">
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
            className="fw-plan-recommendation min-w-0 pl-[27px] [border-left:1px_solid_var(--fw-border)]"
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
        <div className="fw-pricing-toolbar flex items-center justify-between gap-[20px] [margin:25px_0]">
          <p>Tu acceso como dueño no ocupa un cupo del equipo.</p>
          <div
            className="fw-billing-switch flex shrink-0 p-[4px] gap-[3px] [border:1px_solid_var(--fw-border)] rounded-[12px]"
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
        <div className="fw-price-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[19px]">
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
            className="fw-price-trial flex items-center gap-[22px] [padding:27px_30px] mt-[20px] [border:1px_solid_var(--fw-border)] rounded-[17px]"
            aria-labelledby="trial-plan-title"
          >
            <div
              className="fw-trial-symbol grid place-items-center shrink-0 w-[42px] h-[42px] text-[#9a6d00] [border:1px_solid_#d69e0930] rounded-full"
              aria-hidden="true"
            >
              <Check aria-hidden="true" />
            </div>
            <div className="fw-trial-copy [flex:1]">
              <span className="fw-price-list-label block text-[color:var(--fw-muted)] text-[8px] tracking-[0.13em] font-[750]">
                PRIMERO, CONÓCENOS
              </span>
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
            <div className="fw-trial-price flex flex-col shrink-0 gap-[3px]">
              <strong>USD {TRIAL_PLAN.priceUsdMonthly}</strong>
              <span>durante la prueba</span>
            </div>
            <a
              className="fw-button inline-flex items-center justify-center gap-[13px] min-h-[52px] [padding:15px_22px] [border:1px_solid_transparent] rounded-[10px] font-[750] text-[12px] leading-[1.4] fw-price-cta inline-flex items-center justify-between gap-[15px] min-h-[47px] [border:1px_solid_var(--fw-border)] text-[color:var(--fw-text)] text-[12px]"
              href="#contacto"
              aria-label={`Consultar por la ${TRIAL_PLAN.name.toLowerCase()}`}
            >
              Quiero conocerlo
              <Arrow aria-hidden="true" />
            </a>
          </article>
        )}

        <details className="fw-price-details [border-bottom:1px_solid_var(--fw-border)] mt-[24px]">
          <summary>
            <span>Qué incluye cada etapa</span>
            <span aria-hidden="true">+</span>
          </summary>
          <div className="fw-price-detail-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[35px] [padding:5px_0_28px]">
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
      </HomeContainer>
    </section>
  );
}
