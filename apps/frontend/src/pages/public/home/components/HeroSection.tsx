import type { HeroSectionProps } from "../types/homeComponent.types.ts";
import { HomeContainer } from "./HomeContainer";
import { HomeIcon as Icon } from "./HomeIcon";
import { LoyaltyCardStage } from "./LoyaltyCardStage";
export function HeroSection({
  introReady,
  replayKey,
  motionStopped,
  onCardReady,
  replay,
}: HeroSectionProps) {
  return (
    <section
      className={`
        fw-hero [&.is-ready_.fw-hero-copy_>_*]:opacity-100
        [&.is-ready_.fw-hero-copy_>_*]:pointer-events-auto [&.is-ready_.fw-hero-copy_>_*]:transform-none
        relative isolate [background:radial-gradient(ellipse_at_81%_42%,_#087bd70e,_transparent_55%)]
        dark:[background:radial-gradient(ellipse_at_83%_46%,_#087bd71c,_transparent_57%)]
      ${introReady ? "is-ready" : ""}`}
      aria-labelledby="home-title"
      data-motion-scene
    >
      <div
        className={`
          fw-hero-grid absolute inset-0 z-[-1]
          [background-image:linear-gradient(to_right,_var(--fw-border)_1px,_transparent_1px),_linear-gradient(to_bottom,_var(--fw-border)_1px,_transparent_1px)]
          [background-size:96px_96px] opacity-[0.2]
          [mask-image:radial-gradient(ellipse_at_80%_45%,_#000,_transparent_65%)] pointer-events-none
        `}
        aria-hidden="true"
      />
      <HomeContainer className={`
        fw-hero-layout grid [grid-template-columns:1.06fr_1fr] items-center gap-[25px] pt-[59px] pb-[40px]
        min-h-[674px] min-[1500px]:min-h-[720px] max-[1100.001px]:min-h-[615px] max-[1100.001px]:pt-[40px]
        max-[1100.001px]:gap-[8px] max-[700.001px]:flex max-[700.001px]:flex-col max-[700.001px]:pt-[43px]
        max-[700.001px]:pb-[20px] max-[700.001px]:gap-[23px]
      `}>
        <div className={`
          fw-hero-copy [&_>_*]:opacity-0 [&_>_*]:[transform:translateY(18px)]
          [&_>_*]:[transition:opacity_0.65s_ease,_transform_0.65s_cubic-bezier(0.2,_0.65,_0.2,_1)]
          [&:focus-within_>_*]:opacity-100 [&:focus-within_>_*]:pointer-events-auto
          [&:focus-within_>_*]:transform-none [&_>_:nth-child(2)]:delay-[0.08s]
          [&_>_:nth-child(3)]:delay-[0.16s] [&_>_:nth-child(4)]:delay-[0.24s] [&_>_:nth-child(5)]:delay-[0.3s]
          motion-reduce:[&_>_*]:opacity-100 motion-reduce:[&_>_*]:pointer-events-auto
          motion-reduce:[&_>_*]:transform-none [&_>_:nth-child(6)]:delay-[0.36s] z-[5] min-w-0
          pointer-events-none max-[700.001px]:w-[100%] max-[700.001px]:text-center
        `}>
          <span className={`
            fw-eyebrow flex items-center gap-[9px] text-[color:var(--fw-muted)] text-[9px] tracking-[0.13em]
            font-extrabold max-[1100.001px]:text-[8px] max-[700.001px]:justify-center max-[700.001px]:text-[7px]
            max-[700.001px]:tracking-[0.12em]
          `}>
            <span className="fw-status-dot w-[6px] h-[6px] rounded-full shrink-0 [background:#d69e09] [box-shadow:0_0_0_4px_#d69e0915]" />{" "}
            PEQUEÑOS GESTOS. GRANDES CONEXIONES.
          </span>
          <h1 id="home-title">
            Que vuelvan.
            <br />
            <span className="fw-blue-text text-[color:var(--fw-blue)]">
              Una y otra
            </span>
            <br />
            <span className="fw-blue-text text-[color:var(--fw-blue)]">
              vez<span className="fw-gold-text text-[#d69e09]">.</span>
            </span>
          </h1>
          <p className={`
            fw-hero-description text-[color:var(--fw-muted)] text-[17px] leading-[1.8] max-w-[410px]
            max-[1100.001px]:text-[14px] max-[700.001px]:max-w-[385px] max-[700.001px]:[margin-inline:auto]
            max-[700.001px]:text-[13px]
          `}>
            Convierte cada visita en una razón para volver. La tarjeta de
            fidelización de tu negocio, directo al Wallet de tus clientes.
          </p>
          <div
            className={`
              fw-hero-journey [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[5px]
              [&_.fw-icon]:w-[13px] [&_.fw-icon]:h-[13px] [&_.fw-icon]:[color:var(--fw-blue)] [&_>_i]:not-italic
              [&_>_i]:[color:#d69e09] [&_>_i]:text-[12px] max-[700.001px]:[&_.fw-icon]:w-[12px]
              max-[700.001px]:[&_.fw-icon]:h-[12px] max-[350.001px]:[&_>_i]:hidden flex flex-wrap items-center
              gap-[10px] mt-[20px] text-[color:var(--fw-muted)] text-[9px] max-[1100.001px]:gap-[7px]
              max-[1100.001px]:text-[8px] max-[700.001px]:justify-center max-[700.001px]:gap-[7px]
              max-[700.001px]:mt-[17px] max-[480.001px]:[column-gap:7px] max-[480.001px]:[row-gap:8px]
              max-[480.001px]:text-[8px] max-[350.001px]:max-w-[250px] max-[350.001px]:[margin-inline:auto]
            `}
            aria-label="El recorrido de tus clientes"
          >
            <span>
              <Icon name="wallet" /> Guarda su tarjeta
            </span>
            <i aria-hidden="true">→</i>
            <span>
              <Icon name="star" /> Suma visitas
            </span>
            <i aria-hidden="true">→</i>
            <span>
              <Icon name="gift" /> Recibe su premio
            </span>
          </div>
          <div className={`
            fw-hero-ctas max-[900.001px]:[&_.fw-button]:p-[14px_16px] max-[900.001px]:[&_.fw-button]:text-[11px]
            max-[900.001px]:[&_.fw-text-link]:text-[10px] max-[700.001px]:[&_.fw-button]:text-[11px]
            max-[700.001px]:[&_.fw-button]:p-[14px_19px] flex items-center flex-wrap gap-[24px] mt-[25px]
            max-[1100.001px]:gap-[18px] max-[900.001px]:gap-[17px] max-[700.001px]:justify-center
            max-[700.001px]:gap-[25px] max-[700.001px]:mt-[25px] max-[390.001px]:gap-[18px]
          `}>
            <a
              className={`
                fw-button [&:hover]:[transform:translateY(-3px)] motion-reduce:[&:hover]:transform-none inline-flex
                items-center justify-center gap-[13px] min-h-[52px] p-[15px_22px] [border:1px_solid_transparent]
                rounded-[10px] font-[750] leading-[1.4] fw-button-primary [&:hover]:[background:#086cbc]
                [&:hover]:[box-shadow:0_10px_25px_#087bd735] text-[white]
                [transition:transform_0.2s,_box-shadow_0.2s,_background_0.2s] text-[13px] [background:#0873c9]
                [box-shadow:0_7px_20px_#087bd720,_inset_0_1px_0_#ffffff22]
              `}
              href="#contacto"
            >
              Quiero mi tarjeta <Icon name="arrow" />
            </a>
            <a
              className={`
                fw-text-link [&:hover]:[color:var(--fw-blue)] inline-flex items-center gap-[12px]
                text-[color:var(--fw-text)] font-[750] text-[13px]
              `}
              href="#como-funciona"
            >
              Descubre cómo{" "}
              <span className="fw-play-icon w-[25px] h-[25px] grid place-items-center [border:1px_solid_var(--fw-border)] rounded-full text-[16px]">
                ↗
              </span>
            </a>
          </div>
          <div className={`
            fw-hero-note flex items-center gap-[8px] mt-[23px] text-[10px] text-[color:var(--fw-muted)]
            max-[700.001px]:justify-center max-[700.001px]:text-[9px] max-[700.001px]:mt-[17px]
          `}>
            <span className={`
              fw-check-circle [&_.fw-icon]:w-[10px] [&_.fw-icon]:h-[10px] grid place-items-center w-[14px]
              h-[14px] text-[color:var(--fw-blue)] rounded-full [background:#087bd714]
            `}>
              <Icon name="check" />
            </span>{" "}
            Sin apps extra. Sin tarjetas perdidas.
          </div>
        </div>
        <div className="fw-hero-art relative min-w-0 max-[700.001px]:w-[100%] max-[700.001px]:max-w-[480px]">
          <div className="fw-orbit hidden fw-orbit-one" aria-hidden="true" />
          <div className="fw-orbit hidden fw-orbit-two" aria-hidden="true" />
          <div
            className={`
              fw-orbit-star absolute top-[10px] right-[48px] text-[#d69e09] text-[65px] font-normal
              [transform:rotate(15deg)] [animation:fw-star-turn_34s_linear_infinite] [transform-origin:center]
              max-[700.001px]:top-[14px] max-[700.001px]:right-[32px] max-[700.001px]:text-[46px]
            `}
            aria-hidden="true"
          >
            ✳
          </div>
          <LoyaltyCardStage
            onReady={onCardReady}
            replayKey={replayKey}
            motionPaused={motionStopped}
          />
          <button
            className={`
              fw-replay [&_.fw-icon]:w-[12px] [&_.fw-icon]:h-[12px] [&:hover]:[color:var(--fw-blue)] flex
              items-center gap-[6px] text-[color:var(--fw-muted)] m-[13px_auto_0] p-[3px_6px] [border:0]
              [background:none] text-[9px]! max-[700.001px]:mt-[10px]
            `}
            onClick={replay}
          >
            <Icon name="replay" /> Ver demo completa
          </button>
        </div>
      </HomeContainer>
      <HomeContainer className={`
        fw-hero-bottom [&_strong]:[color:var(--fw-text)] [&_strong]:font-[650]
        max-[390.001px]:[&_>_span]:max-w-[145px] flex justify-between items-center
        [border-top:1px_solid_var(--fw-border)] py-[24px] text-[color:var(--fw-muted)] text-[8px]
        tracking-[0.13em] leading-[1.9] max-[700.001px]:[padding-block:20px] max-[700.001px]:text-[6px]
        max-[700.001px]:gap-[20px]
      `}>
        <span>
          EL BUEN SERVICIO SE RECUERDA.
          <br />
          <strong>DALES UNA RAZÓN MÁS PARA VOLVER.</strong>
        </span>
        <a
          href="#como-funciona"
          className={`
            fw-scroll-link [&_span]:w-[32px] [&_span]:h-[32px] [&_span]:grid [&_span]:place-items-center
            [&_span]:[border:1px_solid_var(--fw-border)] [&_span]:rounded-full [&_span]:text-[15px] flex
            gap-[18px] items-center text-[color:var(--fw-muted)] text-[10px] tracking-0
            max-[700.001px]:text-[8px] max-[700.001px]:gap-[10px]
          `}
        >
          Conoce la experiencia <span>↓</span>
        </a>
      </HomeContainer>
    </section>
  );
}
