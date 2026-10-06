import { HomeContainer } from "./HomeContainer";
import { HomeIcon as Icon } from "./HomeIcon";
import { LoyaltyCardStage } from "./LoyaltyCardStage";
export function HeroSection({
  introReady,
  replayKey,
  motionStopped,
  onCardReady,
  replay,
}: {
  introReady: boolean;
  replayKey: number;
  motionStopped: boolean;
  onCardReady: () => void;
  replay: () => void;
}) {
  return (
    <section
      className={`fw-hero relative isolate ${introReady ? "is-ready" : ""}`}
      aria-labelledby="home-title"
      data-motion-scene
    >
      <div
        className="fw-hero-grid absolute inset-0 z-[-1] [background-image:linear-gradient(to_right,_var(--fw-border)_1px,_transparent_1px),_linear-gradient(to_bottom,_var(--fw-border)_1px,_transparent_1px)] [background-size:96px_96px] opacity-[0.2] [mask-image:radial-gradient(ellipse_at_80%_45%,_#000,_transparent_65%)] pointer-events-none"
        aria-hidden="true"
      />
      <HomeContainer className="fw-hero-layout grid [grid-template-columns:1.06fr_1fr] items-center gap-[25px] pt-[59px] pb-[40px] min-h-[674px]">
        <div className="fw-hero-copy z-[5] min-w-0 pointer-events-none">
          <span className="fw-eyebrow flex items-center gap-[9px] text-[color:var(--fw-muted)] text-[9px] tracking-[0.13em] font-extrabold">
            <span className="fw-status-dot w-[6px] h-[6px] rounded-full shrink-0" />{" "}
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
          <p className="fw-hero-description text-[color:var(--fw-muted)] text-[17px] leading-[1.8] max-w-[410px]">
            Convierte cada visita en una razón para volver. La tarjeta de
            fidelización de tu negocio, directo al Wallet de tus clientes.
          </p>
          <div
            className="fw-hero-journey flex flex-wrap items-center gap-[10px] mt-[20px] text-[color:var(--fw-muted)] text-[9px]"
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
          <div className="fw-hero-ctas flex items-center flex-wrap gap-[24px] mt-[25px]">
            <a
              className="fw-button inline-flex items-center justify-center gap-[13px] min-h-[52px] [padding:15px_22px] [border:1px_solid_transparent] rounded-[10px] font-[750] text-[12px] leading-[1.4] fw-button-primary text-[white]"
              href="#contacto"
            >
              Quiero mi tarjeta <Icon name="arrow" />
            </a>
            <a
              className="fw-text-link inline-flex items-center gap-[12px] text-[color:var(--fw-text)] text-[12px] font-[750]"
              href="#como-funciona"
            >
              Descubre cómo{" "}
              <span className="fw-play-icon w-[25px] h-[25px] grid place-items-center [border:1px_solid_var(--fw-border)] rounded-full text-[16px]">
                ↗
              </span>
            </a>
          </div>
          <div className="fw-hero-note flex items-center gap-[8px] mt-[23px] text-[10px] text-[color:var(--fw-muted)]">
            <span className="fw-check-circle grid place-items-center w-[14px] h-[14px] text-[color:var(--fw-blue)] rounded-full">
              <Icon name="check" />
            </span>{" "}
            Sin apps extra. Sin tarjetas perdidas.
          </div>
        </div>
        <div className="fw-hero-art relative min-w-0">
          <div className="fw-orbit hidden fw-orbit-one" aria-hidden="true" />
          <div className="fw-orbit hidden fw-orbit-two" aria-hidden="true" />
          <div
            className="fw-orbit-star absolute top-[10px] right-[48px] text-[#d69e09] text-[65px] font-normal"
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
            className="fw-replay flex items-center gap-[6px] text-[color:var(--fw-muted)] [margin:13px_auto_0] [padding:3px_6px] [border:0]"
            onClick={replay}
          >
            <Icon name="replay" /> Ver demo completa
          </button>
        </div>
      </HomeContainer>
      <HomeContainer className="fw-hero-bottom flex justify-between items-center [border-top:1px_solid_var(--fw-border)] py-[24px] text-[color:var(--fw-muted)] text-[8px] tracking-[0.13em] leading-[1.9]">
        <span>
          EL BUEN SERVICIO SE RECUERDA.
          <br />
          <strong>DALES UNA RAZÓN MÁS PARA VOLVER.</strong>
        </span>
        <a
          href="#como-funciona"
          className="fw-scroll-link flex gap-[18px] items-center text-[color:var(--fw-muted)] text-[10px] tracking-0"
        >
          Conoce la experiencia <span>↓</span>
        </a>
      </HomeContainer>
    </section>
  );
}
