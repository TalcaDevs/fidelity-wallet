import type { PricingSectionProps } from "../types/homeComponent.types.ts";
import { HomeContainer } from "./HomeContainer";
import { SectionHeading } from "./SectionHeading";
import Arrow from "../../../../assets/home/plan-arrow.svg?react";
import Check from "../../../../assets/home/plan-check.svg?react";
import { useState } from "react";
import {
  PAID_PLANS,
  TRIAL_PLAN,
  LOCATION_OPTIONS,
  TEAM_OPTIONS,
  MAX_LOCATIONS,
  MAX_TEAM,
} from "../constants/pricing.constants.ts";
import { countLabel, recommendPlan } from "../models/pricingModel";
import { PlanCard } from "./PlanCard";

export function PricingSection({ motionPaused = false }: PricingSectionProps) {
  const [annual, setAnnual] = useState(false);
  const [locations, setLocations] = useState(LOCATION_OPTIONS[0].value);
  const [teamUsers, setTeamUsers] = useState(TEAM_OPTIONS[0].value);
  const recommendation = recommendPlan(PAID_PLANS, locations, teamUsers);

  return (
    <section
      className={`
        fw-pricing [&[data-motion-paused=true]_*]:[transition:none]!
        [&[data-motion-paused=true]_*]:[animation:none]!
        [&[data-motion-paused=true]_*::before]:[transition:none]!
        [&[data-motion-paused=true]_*::before]:[animation:none]!
        group-data-[reduced-motion=true]/home:[&_*]:[transition:none]!
        group-data-[reduced-motion=true]/home:[&_*]:[animation:none]!
        group-data-[reduced-motion=true]/home:[&_*::before]:[transition:none]!
        group-data-[reduced-motion=true]/home:[&_*::before]:[animation:none]!
        [border-block:1px_solid_var(--fw-border)]
        [background:radial-gradient(ellipse_at_15%_25%,_#087bd70b,_transparent_50%),_var(--fw-soft)]
      `}
      id="planes"
      aria-labelledby="pricing-title"
      data-motion-paused={motionPaused}
    >
      <HomeContainer
        className={`
        fw-section py-[100px] max-[900.001px]:[padding-block:75px] max-[700.001px]:[padding-block:60px]
      `}
      >
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

        <div
          className={`
        fw-plan-finder grid [grid-template-columns:1.1fr_1.2fr_0.8fr] items-center gap-[28px]
        p-[25px_28px] [border:1px_solid_var(--fw-border)] rounded-[18px] [background:var(--fw-surface)]
        max-[1100.001px]:gap-[20px] max-[1100.001px]:p-[24px]
        max-[1100.001px]:[grid-template-columns:1fr_1.2fr] max-[600.001px]:[grid-template-columns:1fr]
        max-[600.001px]:p-[22px] max-[600.001px]:gap-[21px] max-[360.001px]:p-[19px]
      `}
        >
          <div
            className={`
        fw-plan-finder-intro flex gap-[14px] items-center
      `}
          >
            <span
              className="fw-plan-finder-icon text-[#a77600] text-[39px] leading-[1] dark:[color:#edbe47]"
              aria-hidden="true"
            >
              ✳
            </span>
            <div>
              <h3 className="text-[15px] font-[750] tracking-[-0.025em] leading-[1.4]">
                Encuentra tu punto de partida
              </h3>
              <p className="mt-[5px] text-[11px] [color:var(--fw-muted)]">
                Cuéntanos el tamaño de tu operación.
              </p>
            </div>
          </div>
          <div
            className={`
        fw-plan-fields [&_select:focus-visible]:[outline:3px_solid_var(--fw-blue)]
        [&_select:focus-visible]:[outline-offset:3px] flex items-center gap-[12px]
        max-[600.001px]:gap-[10px] max-[360.001px]:flex-col max-[360.001px]:[align-items:stretch]
      `}
          >
            <label
              className="flex flex-col gap-[7px] min-w-[0] [flex:1] [color:var(--fw-muted)] text-[10px] font-[700]"
              htmlFor="plan-locations"
            >
              Locales
              <select
                className={`
        w-[100%] min-h-[44px] p-[8px_27px_8px_12px] [border:1px_solid_var(--fw-border)] rounded-[9px]
        [color:var(--fw-text)] [font:inherit] text-[12px] cursor-pointer [background:var(--fw-bg)]
        max-[600.001px]:text-[11px] max-[600.001px]:pl-[10px]
      `}
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
            <label
              className="flex flex-col gap-[7px] min-w-[0] [flex:1] [color:var(--fw-muted)] text-[10px] font-[700]"
              htmlFor="plan-team"
            >
              Colaboradores
              <select
                className={`
        w-[100%] min-h-[44px] p-[8px_27px_8px_12px] [border:1px_solid_var(--fw-border)] rounded-[9px]
        [color:var(--fw-text)] [font:inherit] text-[12px] cursor-pointer [background:var(--fw-bg)]
        max-[600.001px]:text-[11px] max-[600.001px]:pl-[10px]
      `}
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
            className={`
        fw-plan-recommendation min-w-0 pl-[27px] [border-left:1px_solid_var(--fw-border)]
        max-[1100.001px]:[grid-column:1_/_-1] max-[1100.001px]:[border-left:0]
        max-[1100.001px]:p-[16px_0_0] max-[1100.001px]:[border-top:1px_solid_var(--fw-border)]
        max-[1100.001px]:flex max-[1100.001px]:items-center max-[1100.001px]:gap-[13px]
        max-[1100.001px]:flex-wrap max-[600.001px]:gap-[8px_12px]
      `}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="block [color:var(--fw-muted)] text-[8px] font-[750] tracking-[0.14em]">
              {recommendation ? "TE SUGERIMOS" : "CREZCAMOS JUNTOS"}
            </span>
            <strong
              className={`
        block mt-[3px] text-[22px] leading-[1.35] font-[750] [color:var(--fw-blue)] tracking-[-0.04em]
        max-[1100.001px]:m-[0] max-[1100.001px]:text-[20px]
      `}
            >
              {recommendation
                ? recommendation.name
                : "Hablemos de tu operación"}
            </strong>
            <p
              className={`
        text-[10px] [color:var(--fw-muted)] mt-[3px] max-[1100.001px]:m-[0] max-[1100.001px]:ml-[auto]
        max-[600.001px]:[flex-basis:100%] max-[600.001px]:m-[0]
      `}
            >
              {recommendation
                ? "Según tus locales y equipo."
                : "Revisemos una opción para tu equipo."}
            </p>
          </div>
        </div>
        <div
          className={`
        fw-pricing-toolbar flex items-center justify-between gap-[20px] m-[25px_0]
        max-[600.001px]:[flex-direction:column-reverse] max-[600.001px]:items-start
        max-[600.001px]:gap-[17px] max-[600.001px]:[margin-block:23px]
      `}
        >
          <p className="text-[11px] [color:var(--fw-muted)] max-[600.001px]:text-[10px]">
            Tu acceso como dueño no ocupa un cupo del equipo.
          </p>
          <div
            className={`
        fw-billing-switch [&_button[aria-pressed=true]]:[color:white]
        [&_button[aria-pressed=true]]:[background:#076cbd]
        [&_button[aria-pressed=true]]:[box-shadow:0_3px_8px_#087bd71c] flex shrink-0 p-[4px] gap-[3px]
        [border:1px_solid_var(--fw-border)] rounded-[12px] [background:var(--fw-surface)]
        max-[600.001px]:w-[100%]
      `}
            role="group"
            aria-label="Modalidad de precio"
          >
            {[false, true].map((isAnnual) => (
              <button
                className={`
        min-h-[40px] min-w-[93px] [border:0] rounded-[8px] p-[9px_18px] [color:var(--fw-muted)]
        text-[12px] font-[700] [background:transparent] [transition:background_0.2s,_color_0.2s]
        max-[600.001px]:[flex:1]
      `}
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
        <div
          className={`
        fw-price-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[19px]
        max-[800.001px]:[grid-template-columns:1fr] max-[800.001px]:gap-[17px]
      `}
        >
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
            className={`
        fw-price-trial flex items-center gap-[22px] p-[27px_30px] mt-[20px]
        [border:1px_solid_var(--fw-border)] rounded-[17px] [background:var(--fw-surface)]
        max-[1100.001px]:flex-wrap max-[1100.001px]:gap-[18px] max-[600.001px]:p-[24px]
        max-[600.001px]:gap-[17px] max-[360.001px]:p-[22px]
      `}
            aria-labelledby="trial-plan-title"
          >
            <div
              className={`
        fw-trial-symbol [&_svg]:w-[23px] [&_svg]:h-[23px] grid place-items-center shrink-0 w-[42px]
        h-[42px] text-[#9a6d00] [border:1px_solid_#d69e0930] rounded-full [background:#d69e0915]
        dark:[color:#edbe47] max-[600.001px]:w-[34px] max-[600.001px]:h-[34px]
      `}
              aria-hidden="true"
            >
              <Check aria-hidden="true" />
            </div>
            <div
              className={`
        fw-trial-copy [flex:1] max-[1100.001px]:[flex-basis:65%]
        max-[600.001px]:[flex-basis:calc(100%_-_52px)]
      `}
            >
              <span
                className={`
        fw-price-list-label block text-[color:var(--fw-muted)] text-[8px] tracking-[0.13em] font-[750]
        max-[800.001px]:[grid-column:2] max-[800.001px]:[grid-row:2] max-[800.001px]:[align-self:center]
      `}
              >
                PRIMERO, CONÓCENOS
              </span>
              <h3
                className="text-[16px] font-[700] tracking-[-0.025em] mt-[7px] leading-[1.5] max-[600.001px]:text-[15px]"
                id="trial-plan-title"
              >
                {TRIAL_PLAN.name}: {TRIAL_PLAN.trialDays} días para dar el
                primer paso.
              </h3>
              <p className="text-[10px] [color:var(--fw-muted)] mt-[7px]">
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
            <div
              className={`
        fw-trial-price flex flex-col shrink-0 gap-[3px] max-[1100.001px]:ml-[60px]
        max-[600.001px]:m-[5px_0_0]
      `}
            >
              <strong className="text-[25px] font-[750] tracking-[-0.05em] leading-[1.2] max-[600.001px]:text-[23px]">
                USD {TRIAL_PLAN.priceUsdMonthly}
              </strong>
              <span className="[color:var(--fw-muted)] text-[9px]">
                durante la prueba
              </span>
            </div>
            <a
              className={`
        [flex-shrink:0] p-[12px_17px] max-[1100.001px]:ml-[auto] max-[600.001px]:mt-[5px]
        max-[600.001px]:p-[12px] max-[600.001px]:text-[11px] max-[600.001px]:gap-[8px]
        max-[360.001px]:w-[100%] max-[360.001px]:ml-[0] max-[360.001px]:justify-center fw-button
        [&:hover]:[transform:translateY(-3px)]
        group-data-[reduced-motion=true]/home:[&:hover]:transform-none p-[15px_22px] rounded-[10px]
        font-[750] leading-[1.4] fw-price-cta [&_>_svg]:w-[18px] [&_>_svg]:h-[18px]
        [&_>_svg]:[flex-shrink:0] [&:hover]:[border-color:var(--fw-blue)]
        [&:hover]:[background:var(--fw-soft)]
        [transition:transform_0.2s,_box-shadow_0.2s,_background_0.2s] text-[12px] inline-flex items-center
        justify-between gap-[15px] min-h-[47px] [border:1px_solid_var(--fw-border)] [color:var(--fw-text)]
        [background:var(--fw-bg)]
      `}
              href="#contacto"
              aria-label={`Consultar por la ${TRIAL_PLAN.name.toLowerCase()}`}
            >
              Quiero conocerlo
              <Arrow aria-hidden="true" />
            </a>
          </article>
        )}

        <details
          className={`
        fw-price-details [&_summary::-webkit-details-marker]:hidden
        [&_summary_>_span:last-child]:text-[24px] [&_summary_>_span:last-child]:font-[400]
        [&_summary_>_span:last-child]:[color:var(--fw-muted)]
        [&[open]_summary_>_span:last-child]:[transform:rotate(45deg)]
        [border-bottom:1px_solid_var(--fw-border)] mt-[24px]
      `}
        >
          <summary
            className={`
        flex gap-[20px] justify-between items-center min-h-[60px] p-[17px_0] list-none cursor-pointer
        [color:var(--fw-text)] text-[12px] font-[700]
      `}
          >
            <span>Qué incluye cada etapa</span>
            <span aria-hidden="true">+</span>
          </summary>
          <div
            className={`
        fw-price-detail-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[35px]
        p-[5px_0_28px] max-[800.001px]:[grid-template-columns:1fr] max-[800.001px]:gap-[23px]
      `}
          >
            <div>
              <h3 className="text-[13px] font-[750] mb-[9px]">
                Una base para conectar
              </h3>
              <p className="[color:var(--fw-muted)] text-[11px] leading-[1.9]">
                Todos los planes contemplan tarjetas digitales en Wallet. La
                prueba permite conocer la experiencia con un grupo de hasta{" "}
                {TRIAL_PLAN?.limits.customers} clientes.
              </p>
            </div>
            <div>
              <h3 className="text-[13px] font-[750] mb-[9px]">
                Más espacio para tu negocio
              </h3>
              <p className="[color:var(--fw-muted)] text-[11px] leading-[1.9]">
                Los planes de pago amplían la capacidad de tu equipo y tus
                locales, con clientes ilimitados. Las tarjetas, los premios y la
                experiencia mantienen la identidad de tu marca.
              </p>
            </div>
            <div>
              <h3 className="text-[13px] font-[750] mb-[9px]">
                Detalles que afinamos contigo
              </h3>
              <p className="[color:var(--fw-muted)] text-[11px] leading-[1.9]">
                Revisamos la configuración, las funciones y la disponibilidad de
                las billeteras para tu negocio antes de activar el servicio.
              </p>
            </div>
          </div>
        </details>
        <p
          className={`
        fw-price-reference max-w-[800px] text-[10px] leading-[1.9] [color:var(--fw-muted)] mt-[20px]
        max-[600.001px]:text-[10px]
      `}
        >
          Precios referenciales en USD, sujetos a confirmación. La modalidad
          anual considera el pago del año completo. Conversemos para confirmar
          tu plan, las funciones disponibles y las condiciones de contratación.
        </p>
      </HomeContainer>
    </section>
  );
}
