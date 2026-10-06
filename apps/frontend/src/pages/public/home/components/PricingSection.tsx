import type { PricingSectionProps } from "../types/homeComponent.types.ts";
import { HomeContainer } from "./HomeContainer";
import { SectionHeading } from "./SectionHeading";
import Arrow from "../../../../assets/home/plan-arrow.svg?react";
import Check from "../../../../assets/home/plan-check.svg?react";
import { useState } from "react";
import { PAID_PLANS, TRIAL_PLAN, LOCATION_OPTIONS, TEAM_OPTIONS, MAX_LOCATIONS, MAX_TEAM } from "../constants/pricing.constants.ts";
import { countLabel, recommendPlan } from "../models/pricingModel";
import { PlanCard } from "./PlanCard";

export function PricingSection({
  motionPaused = false,
}: PricingSectionProps) {
  const [annual, setAnnual] = useState(false);
  const [locations, setLocations] = useState(LOCATION_OPTIONS[0].value);
  const [teamUsers, setTeamUsers] = useState(TEAM_OPTIONS[0].value);
  const recommendation = recommendPlan(PAID_PLANS, locations, teamUsers);

  return (
    <section
      className={`
        fw-pricing [&_.fw-price-story]:mt-[8px] [&_.fw-price-story]:[color:var(--fw-muted)]
        [&_.fw-price-story]:text-[12px] [&_.fw-price-period]:min-h-[32px] [&_.fw-price-period]:text-[10px]
        [&_.fw-price-period]:[color:var(--fw-muted)] [&_.fw-price-period]:mt-[11px]
        [&_.fw-price-period]:leading-[1.6] [&_.fw-price-description]:[color:var(--fw-muted)]
        [&_.fw-price-description]:text-[12px] [&_.fw-price-description]:leading-[1.85]
        [&_.fw-price-description]:mt-[12px] [&_.fw-price-description]:min-h-[68px]
        [&_.fw-price-reference]:max-w-[800px] [&_.fw-price-reference]:text-[10px]
        [&_.fw-price-reference]:leading-[1.9] [&_.fw-price-reference]:[color:var(--fw-muted)]
        [&_.fw-price-reference]:mt-[20px] [&[data-motion-paused=true]_*]:[transition:none]!
        [&[data-motion-paused=true]_*]:[animation:none]!
        [&[data-motion-paused=true]_*::before]:[transition:none]!
        [&[data-motion-paused=true]_*::before]:[animation:none]!
        max-[1100.001px]:[&_.fw-price-description]:min-h-[90px]
        max-[800.001px]:[&_.fw-price-description]:[grid-column:1]
        max-[800.001px]:[&_.fw-price-description]:min-h-[0]
        max-[600.001px]:[&_.fw-price-period]:min-h-[auto]
        max-[600.001px]:[&_.fw-price-description]:mt-[17px] motion-reduce:[&_*]:[transition:none]!
        motion-reduce:[&_*]:[animation:none]! motion-reduce:[&_*::before]:[transition:none]!
        motion-reduce:[&_*::before]:[animation:none]! [border-block:1px_solid_var(--fw-border)]
        [background:radial-gradient(ellipse_at_15%_25%,_#087bd70b,_transparent_50%),_var(--fw-soft)]
      `}
      id="planes"
      aria-labelledby="pricing-title"
      data-motion-paused={motionPaused}
    >
      <HomeContainer className={`
        fw-section py-[100px] max-[900.001px]:[padding-block:75px] max-[700.001px]:[padding-block:60px]
      `}>
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

        <div className={`
          fw-plan-finder grid [grid-template-columns:1.1fr_1.2fr_0.8fr] items-center gap-[28px] p-[25px_28px]
          [border:1px_solid_var(--fw-border)] rounded-[18px] [background:var(--fw-surface)]
          max-[1100.001px]:gap-[20px] max-[1100.001px]:p-[24px]
          max-[1100.001px]:[grid-template-columns:1fr_1.2fr] max-[600.001px]:[grid-template-columns:1fr]
          max-[600.001px]:p-[22px] max-[600.001px]:gap-[21px] max-[360.001px]:p-[19px]
        `}>
          <div className={`
            fw-plan-finder-intro [&_h3]:text-[15px] [&_h3]:font-[750] [&_h3]:tracking-[-0.025em]
            [&_h3]:leading-[1.4] [&_p]:mt-[5px] [&_p]:text-[11px] [&_p]:[color:var(--fw-muted)] flex gap-[14px]
            items-center
          `}>
            <span
              className="fw-plan-finder-icon text-[#a77600] text-[39px] leading-[1] dark:[color:#edbe47]"
              aria-hidden="true"
            >
              ✳
            </span>
            <div>
              <h3>Encuentra tu punto de partida</h3>
              <p>Cuéntanos el tamaño de tu operación.</p>
            </div>
          </div>
          <div className={`
            fw-plan-fields [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:min-w-[0]
            [&_label]:[flex:1] [&_label]:[color:var(--fw-muted)] [&_label]:text-[10px] [&_label]:font-[700]
            [&_select]:w-[100%] [&_select]:min-h-[44px] [&_select]:p-[8px_27px_8px_12px]
            [&_select]:[border:1px_solid_var(--fw-border)] [&_select]:rounded-[9px]
            [&_select]:[color:var(--fw-text)] [&_select]:[font:inherit] [&_select]:text-[12px]
            [&_select]:cursor-pointer [&_select]:[background:var(--fw-bg)]
            [&_select:focus-visible]:[outline:3px_solid_var(--fw-blue)]
            [&_select:focus-visible]:[outline-offset:3px] max-[600.001px]:[&_select]:text-[11px]
            max-[600.001px]:[&_select]:pl-[10px] flex items-center gap-[12px] max-[600.001px]:gap-[10px]
            max-[360.001px]:flex-col max-[360.001px]:[align-items:stretch]
          `}>
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
            className={`
              fw-plan-recommendation [&_>_span]:block [&_>_span]:[color:var(--fw-muted)] [&_>_span]:text-[8px]
              [&_>_span]:font-[750] [&_>_span]:tracking-[0.14em] [&_>_strong]:block [&_>_strong]:mt-[3px]
              [&_>_strong]:text-[22px] [&_>_strong]:leading-[1.35] [&_>_strong]:font-[750]
              [&_>_strong]:[color:var(--fw-blue)] [&_>_strong]:tracking-[-0.04em] [&_p]:text-[10px]
              [&_p]:[color:var(--fw-muted)] [&_p]:mt-[3px] max-[1100.001px]:[&_>_strong]:m-[0]
              max-[1100.001px]:[&_>_strong]:text-[20px] max-[1100.001px]:[&_p]:m-[0]
              max-[1100.001px]:[&_p]:ml-[auto] max-[600.001px]:[&_p]:[flex-basis:100%] max-[600.001px]:[&_p]:m-[0]
              min-w-0 pl-[27px] [border-left:1px_solid_var(--fw-border)] max-[1100.001px]:[grid-column:1_/_-1]
              max-[1100.001px]:[border-left:0] max-[1100.001px]:p-[16px_0_0]
              max-[1100.001px]:[border-top:1px_solid_var(--fw-border)] max-[1100.001px]:flex
              max-[1100.001px]:items-center max-[1100.001px]:gap-[13px] max-[1100.001px]:flex-wrap
              max-[600.001px]:gap-[8px_12px]
            `}
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
        <div className={`
          fw-pricing-toolbar [&_>_p]:text-[11px] [&_>_p]:[color:var(--fw-muted)]
          max-[600.001px]:[&_p]:text-[10px] flex items-center justify-between gap-[20px] m-[25px_0]
          max-[600.001px]:[flex-direction:column-reverse] max-[600.001px]:items-start
          max-[600.001px]:gap-[17px] max-[600.001px]:[margin-block:23px]
        `}>
          <p>Tu acceso como dueño no ocupa un cupo del equipo.</p>
          <div
            className={`
              fw-billing-switch [&_button]:min-h-[40px] [&_button]:min-w-[93px] [&_button]:[border:0]
              [&_button]:rounded-[8px] [&_button]:p-[9px_18px] [&_button]:[color:var(--fw-muted)]
              [&_button]:text-[12px] [&_button]:font-[700] [&_button]:[background:transparent]
              [&_button]:[transition:background_0.2s,_color_0.2s] [&_button[aria-pressed=true]]:[color:white]
              [&_button[aria-pressed=true]]:[background:#076cbd]
              [&_button[aria-pressed=true]]:[box-shadow:0_3px_8px_#087bd71c] max-[600.001px]:[&_button]:[flex:1]
              flex shrink-0 p-[4px] gap-[3px] [border:1px_solid_var(--fw-border)] rounded-[12px]
              [background:var(--fw-surface)] max-[600.001px]:w-[100%]
            `}
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
        <div className={`
          fw-price-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[19px]
          max-[800.001px]:[grid-template-columns:1fr] max-[800.001px]:gap-[17px]
        `}>
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
              fw-price-trial [&_.fw-price-cta]:[flex-shrink:0] [&_.fw-price-cta]:p-[12px_17px]
              max-[1100.001px]:[&_.fw-price-cta]:ml-[auto] max-[600.001px]:[&_.fw-price-cta]:mt-[5px]
              max-[600.001px]:[&_.fw-price-cta]:p-[12px] max-[600.001px]:[&_.fw-price-cta]:text-[11px]
              max-[600.001px]:[&_.fw-price-cta]:gap-[8px] max-[360.001px]:[&_.fw-price-cta]:w-[100%]
              max-[360.001px]:[&_.fw-price-cta]:ml-[0] max-[360.001px]:[&_.fw-price-cta]:justify-center flex
              items-center gap-[22px] p-[27px_30px] mt-[20px] [border:1px_solid_var(--fw-border)] rounded-[17px]
              [background:var(--fw-surface)] max-[1100.001px]:flex-wrap max-[1100.001px]:gap-[18px]
              max-[600.001px]:p-[24px] max-[600.001px]:gap-[17px] max-[360.001px]:p-[22px]
            `}
            aria-labelledby="trial-plan-title"
          >
            <div
              className={`
                fw-trial-symbol [&_svg]:w-[23px] [&_svg]:h-[23px] grid place-items-center shrink-0 w-[42px] h-[42px]
                text-[#9a6d00] [border:1px_solid_#d69e0930] rounded-full [background:#d69e0915] dark:[color:#edbe47]
                max-[600.001px]:w-[34px] max-[600.001px]:h-[34px]
              `}
              aria-hidden="true"
            >
              <Check aria-hidden="true" />
            </div>
            <div className={`
              fw-trial-copy [&_h3]:text-[16px] [&_h3]:font-[700] [&_h3]:tracking-[-0.025em] [&_h3]:mt-[7px]
              [&_h3]:leading-[1.5] [&_p]:text-[10px] [&_p]:[color:var(--fw-muted)] [&_p]:mt-[7px]
              max-[600.001px]:[&_h3]:text-[15px] [flex:1] max-[1100.001px]:[flex-basis:65%]
              max-[600.001px]:[flex-basis:calc(100%_-_52px)]
            `}>
              <span className={`
                fw-price-list-label block text-[color:var(--fw-muted)] text-[8px] tracking-[0.13em] font-[750]
                max-[800.001px]:[grid-column:2] max-[800.001px]:[grid-row:2] max-[800.001px]:[align-self:center]
              `}>
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
            <div className={`
              fw-trial-price [&_strong]:text-[25px] [&_strong]:font-[750] [&_strong]:tracking-[-0.05em]
              [&_strong]:leading-[1.2] [&_span]:[color:var(--fw-muted)] [&_span]:text-[9px]
              max-[600.001px]:[&_strong]:text-[23px] flex flex-col shrink-0 gap-[3px] max-[1100.001px]:ml-[60px]
              max-[600.001px]:m-[5px_0_0]
            `}>
              <strong>USD {TRIAL_PLAN.priceUsdMonthly}</strong>
              <span>durante la prueba</span>
            </div>
            <a
              className={`
                fw-button [&:hover]:[transform:translateY(-3px)] motion-reduce:[&:hover]:transform-none
                p-[15px_22px] rounded-[10px] font-[750] leading-[1.4] fw-price-cta [&_>_svg]:w-[18px]
                [&_>_svg]:h-[18px] [&_>_svg]:[flex-shrink:0] [&:hover]:[border-color:var(--fw-blue)]
                [&:hover]:[background:var(--fw-soft)] [transition:transform_0.2s,_box-shadow_0.2s,_background_0.2s]
                text-[12px] inline-flex items-center justify-between gap-[15px] min-h-[47px]
                [border:1px_solid_var(--fw-border)] [color:var(--fw-text)] [background:var(--fw-bg)]
              `}
              href="#contacto"
              aria-label={`Consultar por la ${TRIAL_PLAN.name.toLowerCase()}`}
            >
              Quiero conocerlo
              <Arrow aria-hidden="true" />
            </a>
          </article>
        )}

        <details className={`
          fw-price-details [&_summary]:flex [&_summary]:gap-[20px] [&_summary]:justify-between
          [&_summary]:items-center [&_summary]:min-h-[60px] [&_summary]:p-[17px_0] [&_summary]:list-none
          [&_summary]:cursor-pointer [&_summary]:[color:var(--fw-text)] [&_summary]:text-[12px]
          [&_summary]:font-[700] [&_summary::-webkit-details-marker]:hidden
          [&_summary_>_span:last-child]:text-[24px] [&_summary_>_span:last-child]:font-[400]
          [&_summary_>_span:last-child]:[color:var(--fw-muted)]
          [&[open]_summary_>_span:last-child]:[transform:rotate(45deg)]
          [border-bottom:1px_solid_var(--fw-border)] mt-[24px]
        `}>
          <summary>
            <span>Qué incluye cada etapa</span>
            <span aria-hidden="true">+</span>
          </summary>
          <div className={`
            fw-price-detail-grid [&_h3]:text-[13px] [&_h3]:font-[750] [&_h3]:mb-[9px]
            [&_p]:[color:var(--fw-muted)] [&_p]:text-[11px] [&_p]:leading-[1.9] grid
            [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[35px] p-[5px_0_28px]
            max-[800.001px]:[grid-template-columns:1fr] max-[800.001px]:gap-[23px]
          `}>
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
        <p className="fw-price-reference max-[600.001px]:text-[10px]">
          Precios referenciales en USD, sujetos a confirmación. La modalidad
          anual considera el pago del año completo. Conversemos para confirmar
          tu plan, las funciones disponibles y las condiciones de contratación.
        </p>
      </HomeContainer>
    </section>
  );
}
