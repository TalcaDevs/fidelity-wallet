import type { PlanCardProps } from "../types/homeComponent.types.ts";
import Arrow from "../../../../assets/home/plan-arrow.svg?react";
import Check from "../../../../assets/home/plan-check.svg?react";
import { PLAN_STORIES } from "../constants/pricing.constants.ts";
import { getPlanBenefits } from "../models/pricingModel";
export function PlanCard({
  plan,
  annual,
  recommended,
}: PlanCardProps) {
  const annualPrice = annual ? plan.priceUsdMonthlyAnnual : null;
  const price = annualPrice ?? plan.priceUsdMonthly;
  const story = PLAN_STORIES[plan.id] ?? {
    title: plan.tagline,
    description: plan.tagline,
  };
  const benefits = getPlanBenefits(plan);

  return (
    <article
      className={`
        fw-price-card [&.is-recommended]:[border-color:var(--fw-blue)]
        [&.is-recommended]:[box-shadow:0_15px_35px_#087bd714,_inset_0_0_0_1px_var(--fw-blue)]
        [&_h3]:text-[25px] [&_h3]:leading-[1.2] [&_h3]:font-[750] [&_h3]:tracking-[-0.045em]
        [&_>_.fw-price-cta]:[margin-block:24px_28px] [&_ul]:p-[0] [&_ul]:list-none [&_ul]:m-[15px_0_0]
        [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-[13px] [&_li]:flex [&_li]:gap-[10px] [&_li]:items-start
        [&_li]:[color:var(--fw-text)] [&_li]:text-[12px] [&_li]:leading-[1.65] [&_li_>_svg]:w-[17px]
        [&_li_>_svg]:h-[17px] [&_li_>_svg]:[color:var(--fw-blue)] [&_li_>_svg]:[flex-shrink:0]
        [&_li_>_svg]:mt-[2px] max-[800.001px]:[&_h3]:[grid-column:1]
        max-[800.001px]:[&_>_.fw-price-cta]:[grid-column:1] max-[800.001px]:[&_>_.fw-price-cta]:mb-[0]
        max-[800.001px]:[&_ul]:[grid-column:2] max-[800.001px]:[&_ul]:[grid-row:3_/_8]
        max-[800.001px]:[&_ul]:[align-self:start] max-[600.001px]:[&_h3]:text-[26px]
        max-[600.001px]:[&_>_.fw-price-cta]:[margin-block:23px] max-[600.001px]:[&_ul]:gap-[12px] relative
        flex flex-col min-w-0 p-[29px] [border:1px_solid_var(--fw-border)] rounded-[21px]
        [background:var(--fw-surface)] [box-shadow:inset_0_1px_0_#ffffff40]
        [transition:border-color_0.3s,_box-shadow_0.3s] max-[1100.001px]:p-[23px] max-[800.001px]:grid
        max-[800.001px]:[grid-template-columns:1fr_1fr] max-[800.001px]:[column-gap:30px]
        max-[800.001px]:p-[28px] max-[600.001px]:flex max-[600.001px]:p-[26px]
      ${recommended ? " is-recommended" : ""}`}
      aria-labelledby={`plan-${plan.id}`}
    >
      <div className={`
        fw-price-card-top flex items-center justify-between gap-[7px] min-h-[25px] mb-[24px]
        max-[1100.001px]:gap-[4px] max-[800.001px]:[grid-column:1_/_-1] max-[800.001px]:mb-[20px]
        max-[600.001px]:mb-[18px]
      `}>
        <span className="fw-price-index text-[color:var(--fw-muted)] text-[10px] font-[650]">
          {plan.name}
        </span>
        <span
          className={`
            fw-price-badge [&.is-empty]:[background:transparent] text-[#075c9d] rounded-[5px] text-[8px]
            tracking-[0.06em] font-extrabold p-[5px_7px] whitespace-nowrap [background:#087bd712]
            dark:[color:#a4d7ff] dark:[background:#087bd725] max-[1100.001px]:text-[6px]
            max-[800.001px]:text-[8px]
          ${recommended ? "" : " is-empty"}`}
        >
          {recommended ? "PARA TU NEGOCIO" : "\u00a0"}
        </span>
      </div>
      <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
      <p className="fw-price-story max-[800.001px]:[grid-column:1]">{story.title}</p>
      <div
        className={`
          fw-price-amount [&_strong]:text-[57px] [&_strong]:font-[750] [&_strong]:tracking-[-0.07em]
          [&_>_span]:text-[12px] [&_>_span]:[color:var(--fw-muted)]
          [&_>_span:first-child]:[align-self:flex-start] [&_>_span:first-child]:pt-[7px]
          [&_>_span:first-child]:text-[10px] [&_>_span:first-child]:font-[750] flex gap-[7px]
          [align-items:baseline] mt-[28px] leading-[1] max-[800.001px]:[grid-column:1]
          max-[600.001px]:mt-[23px]
        `}
        aria-label={`USD ${price} por mes`}
      >
        <span>USD</span>
        <strong>{price}</strong>
        <span>/ mes</span>
      </div>
      <p className="fw-price-period max-[800.001px]:[grid-column:1]">
        {annualPrice === null
          ? "Referencia con modalidad mensual"
          : `USD ${annualPrice * 12} por año · pago anual`}
      </p>
      <p className="fw-price-description">{story.description}</p>
      <a
        className={`
          fw-button [&:hover]:[transform:translateY(-3px)] motion-reduce:[&:hover]:transform-none
          p-[15px_22px] rounded-[10px] font-[750] leading-[1.4] fw-price-cta [&_>_svg]:w-[18px]
          [&_>_svg]:h-[18px] [&_>_svg]:[flex-shrink:0] [&:hover]:[border-color:var(--fw-blue)]
          [&:hover]:[background:var(--fw-soft)] [transition:transform_0.2s,_box-shadow_0.2s,_background_0.2s]
          text-[12px] inline-flex items-center justify-between gap-[15px] min-h-[47px]
          [border:1px_solid_var(--fw-border)] [color:var(--fw-text)] [background:var(--fw-bg)]
        ${recommended ? " fw-price-cta-primary [&.fw-price-cta-primary]:[border-color:#076cbd] [&.fw-price-cta-primary]:[color:white] [&.fw-price-cta-primary]:[background:#076cbd] [&.fw-price-cta-primary]:[box-shadow:0_5px_12px_#087bd71a] [&.fw-price-cta-primary:hover]:[color:white] [&.fw-price-cta-primary:hover]:[border-color:#065caa] [&.fw-price-cta-primary:hover]:[background:#065caa] [border-color:#076cbd] text-[white]" : ""}`}
        href="#contacto"
        aria-label={`Consultar por el plan ${plan.name}`}
      >
        Hablemos de {plan.name}
        <Arrow aria-hidden="true" />
      </a>
      <span className={`
        fw-price-list-label block text-[color:var(--fw-muted)] text-[8px] tracking-[0.13em] font-[750]
        max-[800.001px]:[grid-column:2] max-[800.001px]:[grid-row:2] max-[800.001px]:[align-self:center]
      `}>
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
