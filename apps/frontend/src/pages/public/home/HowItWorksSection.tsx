import { HomeContainer } from "./HomeContainer";
import { SectionHeading } from "./SectionHeading";
import { HomeIcon as Icon } from "./HomeIcon";
export function HowItWorksSection() {
  return (
    <HomeContainer
      as="section"
      className="fw-section py-[100px]"
      id="como-funciona"
      aria-labelledby="how-title"
    >
      <SectionHeading
        id="how-title"
        label="01 — ASÍ DE SIMPLE"
        reveal
        title={
          <>
            Cómo funciona
            <span className="fw-gold-text text-[#d69e09]" aria-hidden="true">
              .
            </span>
          </>
        }
      >
        Una experiencia sencilla para tus clientes.
        <br />
        Un nuevo hábito para tu negocio.
      </SectionHeading>
      <ol className="fw-steps list-none m-0 p-0 grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[36px]">
        <li data-reveal>
          <div className="fw-step-top flex items-center justify-between mb-[22px]">
            <span className="fw-step-icon w-[48px] h-[48px] grid place-items-center rounded-[14px] [border:1px_solid_#087bd723] text-[color:var(--fw-blue)]">
              <Icon name="qr" />
            </span>
            <span className="fw-step-number text-[39px] font-medium tracking-[-0.07em] text-[color-mix(in srgb, var(--fw-muted) 23%, transparent)]">
              01
            </span>
          </div>
          <h3>Escanea. Guarda. Listo.</h3>
          <p>
            Tu cliente escanea el QR del local y guarda su tarjeta digital en el
            Wallet de su celular.
          </p>
          <span className="fw-step-tag flex items-center gap-[8px] text-[9px] mt-[24px] font-bold">
            Sin descargar otra app <Icon name="check" />
          </span>
        </li>
        <li data-reveal>
          <div className="fw-step-top flex items-center justify-between mb-[22px]">
            <span className="fw-step-icon w-[48px] h-[48px] grid place-items-center rounded-[14px] [border:1px_solid_#087bd723] text-[color:var(--fw-blue)]">
              <Icon name="star" />
            </span>
            <span className="fw-step-number text-[39px] font-medium tracking-[-0.07em] text-[color-mix(in srgb, var(--fw-muted) 23%, transparent)]">
              02
            </span>
          </div>
          <h3>Cada visita suma.</h3>
          <p>
            Tu equipo escanea la tarjeta y registra un sello. Cada encuentro
            queda un paso más cerca del premio.
          </p>
          <span className="fw-step-tag flex items-center gap-[8px] text-[9px] mt-[24px] font-bold">
            Desde el celular de tu equipo <Icon name="check" />
          </span>
        </li>
        <li data-reveal>
          <div className="fw-step-top flex items-center justify-between mb-[22px]">
            <span className="fw-step-icon w-[48px] h-[48px] grid place-items-center rounded-[14px] [border:1px_solid_#087bd723] text-[color:var(--fw-blue)] fw-step-gold text-[#b68000] [border-color:#d69e0933]">
              <Icon name="gift" />
            </span>
            <span className="fw-step-number text-[39px] font-medium tracking-[-0.07em] text-[color-mix(in srgb, var(--fw-muted) 23%, transparent)]">
              03
            </span>
          </div>
          <h3>Un premio. Otra sonrisa.</h3>
          <p>
            Al reunir los sellos necesarios, tu cliente puede canjear la
            recompensa que definiste para su tarjeta.
          </p>
          <span className="fw-step-tag flex items-center gap-[8px] text-[9px] mt-[24px] font-bold">
            Tus recompensas, tus reglas <Icon name="check" />
          </span>
        </li>
      </ol>
    </HomeContainer>
  );
}
