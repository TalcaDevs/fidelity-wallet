import { HomeContainer } from "./HomeContainer";
import { SectionHeading } from "./SectionHeading";
import { useState } from "react";
import { HomeIcon as Icon } from "./HomeIcon";
import { BUSINESS_EXAMPLES } from "../constants/homeContent.constants.ts";
export function BusinessSection() {
  const [businessIndex, setBusinessIndex] = useState(0);
  const business = BUSINESS_EXAMPLES[businessIndex];
  return (
    <HomeContainer
      as="section"
      className={`
        fw-section py-[100px] fw-business max-[900.001px]:[padding-block:75px]
        max-[700.001px]:[padding-block:60px]
      `}
      id="para-quien"
      aria-labelledby="business-title"
      data-motion-scene
    >
      <SectionHeading
        id="business-title"
        label="03 — EL PRÓXIMO FAVORITO DEL BARRIO"
        reveal
        title={
          <>
            Para quién es
            <span className="fw-gold-text text-[#d69e09]" aria-hidden="true">
              .
            </span>
          </>
        }
      >
        Para negocios que saben que un cliente
        <br />
        puede ser mucho más que una visita.
      </SectionHeading>
      <div
        className={`
        fw-business-switch [&_.fw-icon]:w-[17px] [&_.fw-icon]:h-[17px]
        [&_button[aria-pressed=true]]:[color:white] [&_button[aria-pressed=true]]:[border-color:#0873c9]
        [&_button[aria-pressed=true]]:[background:#0873c9] [&_button:hover]:[border-color:#087bd7]
        [&_button:is(:hover,_:focus-visible)]:[transform:translateY(-3px)]
        [&_button:is(:hover,_:focus-visible)]:[box-shadow:0_6px_18px_#087bd714]
        [&_button_.fw-icon]:[transition:transform_0.35s]
        [&_button:is(:hover,_:focus-visible)_.fw-icon]:[transform:rotate(-12deg)_scale(1.12)]
        group-data-[reduced-motion=true]/home:[&_button:is(:hover,_:focus-visible)]:transform-none
        group-data-[reduced-motion=true]/home:[&_button:is(:hover,_:focus-visible)_.fw-icon]:transform-none
        flex gap-[10px] mb-[30px] flex-wrap max-[700.001px]:gap-[8px]
      `}
        role="group"
        aria-label="Explora un ejemplo para tu negocio"
      >
        {BUSINESS_EXAMPLES.map((item, index) => (
          <button
            className={`
        inline-flex items-center gap-[9px] p-[10px_19px] min-h-[44px] [border:1px_solid_var(--fw-border)]
        rounded-[100px] [color:var(--fw-muted)] text-[11px] font-[650] [background:transparent]
        [transition:transform_0.25s,_background_0.25s,_border-color_0.25s,_box-shadow_0.25s]
        max-[700.001px]:[flex:1_1_calc(50%_-_8px)] max-[700.001px]:justify-center
        max-[700.001px]:p-[10px_13px]
      `}
            key={item.name}
            aria-pressed={index === businessIndex}
            onClick={() => setBusinessIndex(index)}
          >
            <Icon name={item.icon} />
            {item.name}
          </button>
        ))}
      </div>
      <div
        className={`
        fw-business-example [&::before]:absolute [&::before]:[inset:-50%_-15%] [&::before]:z-[-1]
        [&::before]:pointer-events-none [&::before]:[content:'']
        [&::before]:[background:radial-gradient(ellipse_at_20%_60%,_#d69e0910,_transparent_42%),_radial-gradient(ellipse_at_75%_40%,_#087bd710,_transparent_45%)]
        [&::before]:[animation:fw-business-light_14s_ease-in-out_infinite_alternate] grid
        [grid-template-columns:230px_1fr_70px] gap-[50px] items-center p-[40px]
        [border:1px_solid_var(--fw-border)] rounded-[22px] relative isolate overflow-hidden
        [background:var(--fw-surface)] max-[1100.001px]:[grid-template-columns:175px_1fr_45px]
        max-[1100.001px]:gap-[28px] max-[1100.001px]:p-[30px]
        max-[900.001px]:[grid-template-columns:135px_1fr] max-[700.001px]:relative max-[700.001px]:flex
        max-[700.001px]:flex-col max-[700.001px]:items-start max-[700.001px]:p-[26px]
        max-[700.001px]:gap-[30px]
      `}
        data-reveal
      >
        <div
          className={`
        fw-business-emblem [&_>_.fw-icon]:w-[56px] [&_>_.fw-icon]:h-[56px]
        [&_>_.fw-icon]:[stroke-width:1.1]
        [&_>_.fw-icon]:[animation:fw-business-icon-in_0.65s_cubic-bezier(0.2,_0.8,_0.2,_1)_both,_fw-business-icon-sway_5s_0.65s_ease-in-out_infinite]
        max-[900.001px]:[&_>_.fw-icon]:w-[40px] max-[900.001px]:[&_>_.fw-icon]:h-[40px] flex flex-col
        items-center justify-center gap-[20px] w-[195px] h-[195px] [border:1px_solid_#d69e0930]
        rounded-full text-[#ac7a07] relative [background:#d69e0910] [transform:rotate(-9deg)]
        [animation:fw-business-float_7s_ease-in-out_infinite] dark:[color:#e4b43a]
        max-[1100.001px]:w-[165px] max-[1100.001px]:h-[165px] max-[900.001px]:w-[135px]
        max-[900.001px]:h-[135px] max-[700.001px]:w-[125px] max-[700.001px]:h-[125px]
        max-[700.001px]:gap-[12px]
      `}
          aria-hidden="true"
        >
          <i
            className={`
        fw-business-orbit [&::before]:absolute [&::before]:w-[7px] [&::before]:h-[7px]
        [&::before]:rounded-full [&::before]:top-[50%] [&::before]:left-[-4px] [&::before]:[content:'']
        [&::before]:[background:#d69e09] [&::before]:[box-shadow:0_0_0_5px_#d69e0912] [&::after]:absolute
        [&::after]:w-[5px] [&::after]:h-[5px] [&::after]:rounded-full [&::after]:top-[50%]
        [&::after]:left-[auto] [&::after]:[content:''] [&::after]:[background:var(--fw-blue)]
        [&::after]:[box-shadow:0_0_0_5px_#d69e0912] [&::after]:right-[-4px] absolute inset-[-12px]
        [border:1px_dashed_#d69e0938] rounded-full pointer-events-none
        [animation:fw-business-orbit_22s_linear_infinite] max-[700.001px]:[inset:-8px]
      `}
          />
          <Icon key={business.name} name={business.icon} />
          <span className="text-[8px] text-center tracking-[0.2em] leading-[1.9] font-[700] max-[700.001px]:text-[6px]">
            BUENOS MOMENTOS
            <br />
            QUE SE REPITEN
          </span>
        </div>
        <div
          className={`
        fw-business-copy
        [&_>_:is(h3,_p,_.fw-example-reward)]:[animation:fw-business-copy-in_0.55s_cubic-bezier(0.2,_0.7,_0.2,_1)_both]
      `}
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            className={`
        mb-[12px] fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold
        tracking-[0.16em] mb-[17px] max-[700.001px]:text-[8px] max-[700.001px]:mb-[14px]
      `}
          >
            {business.name}
          </span>
          <h3
            className={`
        text-[30px] font-[700] tracking-[-0.045em] leading-[1.25] max-w-[430px]
        max-[1100.001px]:text-[27px] max-[700.001px]:text-[28px]
      `}
            key={`${business.name}-title`}
          >
            {business.title}
          </h3>
          <p
            className={`
        max-w-[460px] [color:var(--fw-muted)] text-[14px] mt-[15px] max-[700.001px]:text-[12px]
        [animation-delay:0.07s]
      `}
            key={`${business.name}-description`}
          >
            {business.description}
          </p>
          <div
            className={`
        [animation-delay:0.14s] fw-example-reward [&_>_.fw-icon]:w-[15px] [&_>_.fw-icon]:h-[15px]
        [&_>_.fw-icon]:[color:#b78208] flex items-center flex-wrap gap-[9px] text-[10px] mt-[22px]
        font-[650] max-[700.001px]:text-[10px]
      `}
            key={`${business.name}-reward`}
          >
            <Icon name="gift" />
            {business.reward}
            <span className="text-[8px] [color:var(--fw-muted)] [border:1px_solid_var(--fw-border)] p-[2px_7px] rounded-[4px]">
              Ejemplo
            </span>
          </div>
        </div>
        <a
          className={`
        fw-business-arrow [&:hover]:[background:#087bd715] [&_.fw-icon]:[transition:transform_0.3s]
        [&:is(:hover,_:focus-visible)_.fw-icon]:[transform:translate(3px,_-3px)]
        group-data-[reduced-motion=true]/home:[&:is(:hover,_:focus-visible)_.fw-icon]:transform-none grid
        place-items-center w-[54px] h-[54px] rounded-full text-[color:var(--fw-blue)]
        [border:1px_solid_var(--fw-border)] [transition:background_0.2s] max-[900.001px]:hidden
        max-[700.001px]:grid max-[700.001px]:absolute max-[700.001px]:top-[35px]
        max-[700.001px]:right-[26px]
      `}
          href="#contacto"
          aria-label={`Consultar por Fidelity Wallet para ${business.name.toLowerCase()}`}
        >
          <Icon name="diagonal" />
        </a>
      </div>
    </HomeContainer>
  );
}
