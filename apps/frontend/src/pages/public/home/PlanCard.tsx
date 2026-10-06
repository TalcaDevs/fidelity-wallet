import type { Plan } from "@fidelity/shared";
import Arrow from "../../../assets/home/plan-arrow.svg?react";
import Check from "../../../assets/home/plan-check.svg?react";
import { PLAN_STORIES, getPlanBenefits } from "./pricingModel";
export function PlanCard({
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
      className={`fw-price-card relative flex flex-col min-w-0 p-[29px] [border:1px_solid_var(--fw-border)] rounded-[21px]${recommended ? " is-recommended" : ""}`}
      aria-labelledby={`plan-${plan.id}`}
    >
      <div className="fw-price-card-top flex items-center justify-between gap-[7px] min-h-[25px] mb-[24px]">
        <span className="fw-price-index text-[color:var(--fw-muted)] text-[10px] font-[650]">
          {plan.name}
        </span>
        <span
          className={`fw-price-badge text-[#075c9d] rounded-[5px] text-[8px] tracking-[0.06em] font-extrabold [padding:5px_7px] whitespace-nowrap${recommended ? "" : " is-empty"}`}
        >
          {recommended ? "PARA TU NEGOCIO" : "\u00a0"}
        </span>
      </div>
      <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
      <p className="fw-price-story">{story.title}</p>
      <div
        className="fw-price-amount flex gap-[7px] [align-items:baseline] mt-[28px] leading-[1]"
        aria-label={`USD ${price} por mes`}
      >
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
        className={`fw-button inline-flex items-center justify-center gap-[13px] min-h-[52px] [padding:15px_22px] [border:1px_solid_transparent] rounded-[10px] font-[750] text-[12px] leading-[1.4] fw-price-cta inline-flex items-center justify-between gap-[15px] min-h-[47px] [border:1px_solid_var(--fw-border)] text-[color:var(--fw-text)] text-[12px]${recommended ? " fw-price-cta-primary [border-color:#076cbd] text-[white]" : ""}`}
        href="#contacto"
        aria-label={`Consultar por el plan ${plan.name}`}
      >
        Hablemos de {plan.name}
        <Arrow aria-hidden="true" />
      </a>
      <span className="fw-price-list-label block text-[color:var(--fw-muted)] text-[8px] tracking-[0.13em] font-[750]">
        LO QUE PUEDES HACER
      </span>
      <ul>
        {benefits.map((benefit) => (
          <li key={benefit}>
            <Check aria-hidden="true" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
