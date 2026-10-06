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
        fw-section py-[100px] fw-business max-[900.001px]:[padding-block:75px] max-[700.001px]:[padding-block:60px]
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
          fw-business-switch [&_button]:inline-flex [&_button]:items-center [&_button]:gap-[9px]
          [&_button]:p-[10px_19px] [&_button]:min-h-[44px] [&_button]:[border:1px_solid_var(--fw-border)]
          [&_button]:rounded-[100px] [&_button]:[color:var(--fw-muted)] [&_button]:text-[11px]
          [&_button]:font-[650] [&_button]:[background:transparent]
          [&_button]:[transition:transform_0.25s,_background_0.25s,_border-color_0.25s,_box-shadow_0.25s]
          [&_.fw-icon]:w-[17px] [&_.fw-icon]:h-[17px] [&_button[aria-pressed=true]]:[color:white]
          [&_button[aria-pressed=true]]:[border-color:#0873c9]
          [&_button[aria-pressed=true]]:[background:#0873c9] [&_button:hover]:[border-color:#087bd7]
          max-[700.001px]:[&_button]:[flex:1_1_calc(50%_-_8px)] max-[700.001px]:[&_button]:justify-center
          max-[700.001px]:[&_button]:p-[10px_13px]
          [&_button:is(:hover,_:focus-visible)]:[transform:translateY(-3px)]
          [&_button:is(:hover,_:focus-visible)]:[box-shadow:0_6px_18px_#087bd714]
          [&_button_.fw-icon]:[transition:transform_0.35s]
          [&_button:is(:hover,_:focus-visible)_.fw-icon]:[transform:rotate(-12deg)_scale(1.12)]
          motion-reduce:[&_button:is(:hover,_:focus-visible)]:transform-none
          motion-reduce:[&_button:is(:hover,_:focus-visible)_.fw-icon]:transform-none flex gap-[10px]
          mb-[30px] flex-wrap max-[700.001px]:gap-[8px]
        `}
        role="group"
        aria-label="Explora un ejemplo para tu negocio"
      >
        {BUSINESS_EXAMPLES.map((item, index) => (
          <button
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
            fw-business-emblem [&_>_.fw-icon]:w-[56px] [&_>_.fw-icon]:h-[56px] [&_>_.fw-icon]:[stroke-width:1.1]
            [&_>_.fw-icon]:[animation:fw-business-icon-in_0.65s_cubic-bezier(0.2,_0.8,_0.2,_1)_both,_fw-business-icon-sway_5s_0.65s_ease-in-out_infinite]
            [&_span]:text-[8px] [&_span]:text-center [&_span]:tracking-[0.2em] [&_span]:leading-[1.9]
            [&_span]:font-[700] max-[900.001px]:[&_>_.fw-icon]:w-[40px] max-[900.001px]:[&_>_.fw-icon]:h-[40px]
            max-[700.001px]:[&_span]:text-[6px] flex flex-col items-center justify-center gap-[20px] w-[195px]
            h-[195px] [border:1px_solid_#d69e0930] rounded-full text-[#ac7a07] relative [background:#d69e0910]
            [transform:rotate(-9deg)] [animation:fw-business-float_7s_ease-in-out_infinite] dark:[color:#e4b43a]
            max-[1100.001px]:w-[165px] max-[1100.001px]:h-[165px] max-[900.001px]:w-[135px]
            max-[900.001px]:h-[135px] max-[700.001px]:w-[125px] max-[700.001px]:h-[125px]
            max-[700.001px]:gap-[12px]
          `}
          aria-hidden="true"
        >
          <i className={`
            fw-business-orbit [&::before]:absolute [&::before]:w-[7px] [&::before]:h-[7px]
            [&::before]:rounded-full [&::before]:top-[50%] [&::before]:left-[-4px] [&::before]:[content:'']
            [&::before]:[background:#d69e09] [&::before]:[box-shadow:0_0_0_5px_#d69e0912] [&::after]:absolute
            [&::after]:w-[5px] [&::after]:h-[5px] [&::after]:rounded-full [&::after]:top-[50%]
            [&::after]:left-[auto] [&::after]:[content:''] [&::after]:[background:var(--fw-blue)]
            [&::after]:[box-shadow:0_0_0_5px_#d69e0912] [&::after]:right-[-4px] absolute inset-[-12px]
            [border:1px_dashed_#d69e0938] rounded-full pointer-events-none
            [animation:fw-business-orbit_22s_linear_infinite] max-[700.001px]:[inset:-8px]
          `} />
          <Icon key={business.name} name={business.icon} />
          <span>
            BUENOS MOMENTOS
            <br />
            QUE SE REPITEN
          </span>
        </div>
        <div className={`
          fw-business-copy [&_.fw-section-label]:mb-[12px] [&_h3]:text-[30px] [&_h3]:font-[700]
          [&_h3]:tracking-[-0.045em] [&_h3]:leading-[1.25] [&_h3]:max-w-[430px] [&_p]:max-w-[460px]
          [&_p]:[color:var(--fw-muted)] [&_p]:text-[14px] [&_p]:mt-[15px] max-[1100.001px]:[&_h3]:text-[27px]
          max-[700.001px]:[&_h3]:text-[28px] max-[700.001px]:[&_p]:text-[12px]
          [&_>_:is(h3,_p,_.fw-example-reward)]:[animation:fw-business-copy-in_0.55s_cubic-bezier(0.2,_0.7,_0.2,_1)_both]
          [&_>_p]:[animation-delay:0.07s] [&_>_.fw-example-reward]:[animation-delay:0.14s]
        `} aria-live="polite" aria-atomic="true">
          <span className={`
            fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold tracking-[0.16em]
            mb-[17px] max-[700.001px]:text-[8px] max-[700.001px]:mb-[14px]
          `}>
            {business.name}
          </span>
          <h3 key={`${business.name}-title`}>{business.title}</h3>
          <p key={`${business.name}-description`}>{business.description}</p>
          <div
            className={`
              fw-example-reward [&_>_.fw-icon]:w-[15px] [&_>_.fw-icon]:h-[15px] [&_>_.fw-icon]:[color:#b78208]
              [&_>_span]:text-[8px] [&_>_span]:[color:var(--fw-muted)]
              [&_>_span]:[border:1px_solid_var(--fw-border)] [&_>_span]:p-[2px_7px] [&_>_span]:rounded-[4px] flex
              items-center flex-wrap gap-[9px] text-[10px] mt-[22px] font-[650] max-[700.001px]:text-[10px]
            `}
            key={`${business.name}-reward`}
          >
            <Icon name="gift" />
            {business.reward}
            <span>Ejemplo</span>
          </div>
        </div>
        <a
          className={`
            fw-business-arrow [&:hover]:[background:#087bd715] [&_.fw-icon]:[transition:transform_0.3s]
            [&:is(:hover,_:focus-visible)_.fw-icon]:[transform:translate(3px,_-3px)]
            motion-reduce:[&:is(:hover,_:focus-visible)_.fw-icon]:transform-none grid place-items-center
            w-[54px] h-[54px] rounded-full text-[color:var(--fw-blue)] [border:1px_solid_var(--fw-border)]
            [transition:background_0.2s] max-[900.001px]:hidden max-[700.001px]:grid max-[700.001px]:absolute
            max-[700.001px]:top-[35px] max-[700.001px]:right-[26px]
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
