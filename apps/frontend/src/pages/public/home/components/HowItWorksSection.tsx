import { HomeContainer } from "./HomeContainer";
import { SectionHeading } from "./SectionHeading";
import { HomeIcon as Icon } from "./HomeIcon";
export function HowItWorksSection() {
  return (
    <HomeContainer
      as="section"
      className={`
        fw-section py-[100px] max-[900.001px]:[padding-block:75px] max-[700.001px]:[padding-block:60px]
      `}
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
      <ol
        className={`
        fw-steps [&_li_+_li]:[border-left:1px_solid_var(--fw-border)] [&_li_+_li]:pl-[32px]
        max-[1100.001px]:[&_li_+_li]:pl-[22px] max-[700.001px]:[&_li_+_li]:p-[0_0_26px]
        max-[700.001px]:[&_li_+_li]:[border:0]
        max-[700.001px]:[&_li_+_li]:[border-bottom:1px_solid_var(--fw-border)]
        max-[700.001px]:[&_li:last-child]:[border:0] max-[700.001px]:[&_li:last-child]:pb-[0] list-none
        m-0 p-0 grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[36px]
        max-[1100.001px]:gap-[18px] max-[700.001px]:[grid-template-columns:1fr] max-[700.001px]:gap-[25px]
      `}
      >
        <li
          className={`
        relative p-[8px_26px_0_0] max-[1100.001px]:pr-[10px] max-[700.001px]:p-[0_0_26px]
        max-[700.001px]:[border:0] max-[700.001px]:[border-bottom:1px_solid_var(--fw-border)]
      `}
          data-reveal
        >
          <div className="fw-step-top flex items-center justify-between mb-[22px] max-[700.001px]:mb-[17px]">
            <span
              className={`
        fw-step-icon [&_.fw-icon]:w-[25px] [&_.fw-icon]:h-[25px] w-[48px] h-[48px] grid place-items-center
        rounded-[14px] [border:1px_solid_#087bd723] text-[color:var(--fw-blue)] [background:#087bd70c]
      `}
            >
              <Icon name="qr" />
            </span>
            <span
              className={`
        fw-step-number text-[39px] font-medium tracking-[-0.07em] text-[color-mix(in srgb, var(--fw-muted)
        23%, transparent)]
      `}
            >
              01
            </span>
          </div>
          <h3 className="text-[19px] tracking-[-0.04em] font-[750] mb-[13px] max-[1100.001px]:text-[17px] max-[700.001px]:text-[21px]">
            Escanea. Guarda. Listo.
          </h3>
          <p className="[color:var(--fw-muted)] text-[14px] leading-[1.9] max-[700.001px]:text-[12px] max-[700.001px]:max-w-[420px]">
            Tu cliente escanea el QR del local y guarda su tarjeta digital en el
            Wallet de su celular.
          </p>
          <span
            className={`
        fw-step-tag [&_.fw-icon]:w-[12px] [&_.fw-icon]:h-[12px] [&_.fw-icon]:[color:var(--fw-blue)] flex
        items-center gap-[8px] text-[9px] mt-[24px] font-bold max-[700.001px]:mt-[16px]
      `}
          >
            Sin descargar otra app <Icon name="check" />
          </span>
        </li>
        <li
          className={`
        relative p-[8px_26px_0_0] max-[1100.001px]:pr-[10px] max-[700.001px]:p-[0_0_26px]
        max-[700.001px]:[border:0] max-[700.001px]:[border-bottom:1px_solid_var(--fw-border)]
      `}
          data-reveal
        >
          <div className="fw-step-top flex items-center justify-between mb-[22px] max-[700.001px]:mb-[17px]">
            <span
              className={`
        fw-step-icon [&_.fw-icon]:w-[25px] [&_.fw-icon]:h-[25px] w-[48px] h-[48px] grid place-items-center
        rounded-[14px] [border:1px_solid_#087bd723] text-[color:var(--fw-blue)] [background:#087bd70c]
      `}
            >
              <Icon name="star" />
            </span>
            <span
              className={`
        fw-step-number text-[39px] font-medium tracking-[-0.07em] text-[color-mix(in srgb, var(--fw-muted)
        23%, transparent)]
      `}
            >
              02
            </span>
          </div>
          <h3 className="text-[19px] tracking-[-0.04em] font-[750] mb-[13px] max-[1100.001px]:text-[17px] max-[700.001px]:text-[21px]">
            Cada visita suma.
          </h3>
          <p className="[color:var(--fw-muted)] text-[14px] leading-[1.9] max-[700.001px]:text-[12px] max-[700.001px]:max-w-[420px]">
            Tu equipo escanea la tarjeta y registra un sello. Cada encuentro
            queda un paso más cerca del premio.
          </p>
          <span
            className={`
        fw-step-tag [&_.fw-icon]:w-[12px] [&_.fw-icon]:h-[12px] [&_.fw-icon]:[color:var(--fw-blue)] flex
        items-center gap-[8px] text-[9px] mt-[24px] font-bold max-[700.001px]:mt-[16px]
      `}
          >
            Desde el celular de tu equipo <Icon name="check" />
          </span>
        </li>
        <li
          className={`
        relative p-[8px_26px_0_0] max-[1100.001px]:pr-[10px] max-[700.001px]:p-[0_0_26px]
        max-[700.001px]:[border:0] max-[700.001px]:[border-bottom:1px_solid_var(--fw-border)]
      `}
          data-reveal
        >
          <div className="fw-step-top flex items-center justify-between mb-[22px] max-[700.001px]:mb-[17px]">
            <span
              className={`
        fw-step-icon [&_.fw-icon]:w-[25px] [&_.fw-icon]:h-[25px] w-[48px] h-[48px] grid place-items-center
        rounded-[14px] [border:1px_solid_#087bd723] fw-step-gold [background:#d69e0910] [color:#b68000]
        [border-color:#d69e0933] dark:[color:#e9b940]
      `}
            >
              <Icon name="gift" />
            </span>
            <span
              className={`
        fw-step-number text-[39px] font-medium tracking-[-0.07em] text-[color-mix(in srgb, var(--fw-muted)
        23%, transparent)]
      `}
            >
              03
            </span>
          </div>
          <h3 className="text-[19px] tracking-[-0.04em] font-[750] mb-[13px] max-[1100.001px]:text-[17px] max-[700.001px]:text-[21px]">
            Un premio. Otra sonrisa.
          </h3>
          <p className="[color:var(--fw-muted)] text-[14px] leading-[1.9] max-[700.001px]:text-[12px] max-[700.001px]:max-w-[420px]">
            Al reunir los sellos necesarios, tu cliente puede canjear la
            recompensa que definiste para su tarjeta.
          </p>
          <span
            className={`
        fw-step-tag [&_.fw-icon]:w-[12px] [&_.fw-icon]:h-[12px] [&_.fw-icon]:[color:var(--fw-blue)] flex
        items-center gap-[8px] text-[9px] mt-[24px] font-bold max-[700.001px]:mt-[16px]
      `}
          >
            Tus recompensas, tus reglas <Icon name="check" />
          </span>
        </li>
      </ol>
    </HomeContainer>
  );
}
