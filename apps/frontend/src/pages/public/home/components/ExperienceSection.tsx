import { CARD_COLORS, INITIAL_CARD_COLOR } from "../constants/experience.constants.ts";
import type { ExperienceSectionProps } from "../types/homeComponent.types.ts";
import { HomeContainer } from "./HomeContainer";
import { SectionHeading } from "./SectionHeading";
import { useState, type CSSProperties } from "react";
import { HomeIcon as Icon } from "./HomeIcon";
import { ActivityChart } from "./ActivityChart";
export function ExperienceSection({
  motionStopped,
}: ExperienceSectionProps) {
  const [cardColor, setCardColor] = useState<string>(INITIAL_CARD_COLOR);
  return (
    <section
      className={`
        fw-experience [&::before]:pointer-events-none [&::before]:absolute [&::before]:[inset:8%_0_20%]
        [&::before]:z-[-1] [&::before]:[content:'']
        [&::before]:[background:radial-gradient(ellipse_at_15%_25%,_#087bd70a,_transparent_50%),_radial-gradient(ellipse_at_80%_70%,_#d69e0910,_transparent_50%)]
        [&::before]:[animation:fw-experience-flow_24s_ease-in-out_infinite_alternate]
        [border-block:1px_solid_var(--fw-border)] relative isolate
        [background:radial-gradient(ellipse_at_8%_55%,_#087bd710,_transparent_48%),_radial-gradient(ellipse_at_90%_90%,_#d69e090a,_transparent_35%),_var(--fw-soft)]
      `}
      id="posibilidades"
      aria-labelledby="experience-title"
      data-motion-scene
    >
      <HomeContainer className={`
        fw-section py-[100px] max-[900.001px]:[padding-block:75px] max-[700.001px]:[padding-block:60px]
      `}>
        <SectionHeading
          id="experience-title"
          label="02 — DISEÑADO PARA CONECTAR"
          reveal
          title={
            <>
              Mucho más
              <br />
              que un sello<span className="fw-gold-text text-[#d69e09]">.</span>
            </>
          }
        >
          Tu identidad, tus premios y tus clientes.
          <br />
          Todo en una experiencia que se siente tuya.
        </SectionHeading>
        <div className={`
          fw-bento-grid grid [grid-template-columns:repeat(12,_minmax(0,_1fr))] gap-[20px]
          max-[700.001px]:flex max-[700.001px]:flex-col max-[700.001px]:gap-[15px]
        `}>
          <article
            className={`
              fw-bento [&::after]:absolute [&::after]:[inset:0] [&::after]:z-[-1] [&::after]:pointer-events-none
              [&::after]:rounded-[inherit] [&::after]:[content:'']
              [&::after]:[background:linear-gradient(120deg,_#ffffff09,_transparent_40%)] [&_h3]:text-[26px]
              [&_h3]:leading-[1.3] [&_h3]:tracking-[-0.045em] [&_h3]:font-[750] [&_h3]:mb-[13px]
              [&_p]:[color:var(--fw-muted)] [&_p]:text-[14px] [&_p]:leading-[1.9] [&_p]:max-w-[300px]
              [&:hover]:[border-color:color-mix(in_srgb,_var(--fw-blue)_30%,_var(--fw-border))]
              [&:hover]:[box-shadow:inset_0_1px_0_#ffffff35,_0_10px_40px_#087bd70c]
              max-[1100.001px]:[&_h3]:text-[24px] max-[900.001px]:[&_h3]:text-[22px]
              max-[900.001px]:[&_p]:text-[11px] max-[700.001px]:[&_h3]:text-[26px]
              max-[700.001px]:[&_p]:text-[12px] max-[390.001px]:[&_h3]:text-[23px]
              max-[390.001px]:[&_p]:text-[11px] max-[480.001px]:[&_p]:text-[13px]
              [&:is(:hover,_:focus-within)_.fw-feature-icon_.fw-icon]:[transform:rotate(-14deg)_scale(1.14)]
              motion-reduce:[&:is(:hover,_:focus-within)_:is(.fw-wallet-front,_.fw-wallet-back,_.fw-feature-icon_.fw-icon)]:transform-none
              relative isolate overflow-hidden p-[34px] [border:1px_solid_var(--fw-border)] rounded-[22px]
              fw-bento-brand [&_.fw-mini-wallet]:top-[50%] [&_.fw-mini-wallet]:mt-[-125px]
              [&_.fw-mini-wallet]:[animation:fw-card-hover_8s_ease-in-out_infinite]
              [&:is(:hover,_:focus-within)_.fw-wallet-front]:[transform:rotate(4deg)_translateY(-7px)]
              [&:is(:hover,_:focus-within)_.fw-wallet-back]:[transform:rotate(20deg)_translateX(7px)]
              max-[480.001px]:[&_.fw-mini-wallet]:top-[auto] max-[480.001px]:[&_.fw-mini-wallet]:mt-[0]
              [background:radial-gradient(ellipse_at_98%_60%,_#087bd71f,_transparent_62%),_var(--fw-surface)]
              [backdrop-filter:blur(18px)] [box-shadow:inset_0_1px_0_#ffffff24,_0_10px_30px_#13273804]
              [transition:border-color_0.25s,_box-shadow_0.25s] max-[1100.001px]:p-[27px] max-[700.001px]:p-[27px]
              max-[700.001px]:rounded-[18px] max-[390.001px]:p-[23px] [grid-column:span_7] min-h-[380px] flex
              items-center max-[900.001px]:[grid-column:span_7] max-[900.001px]:min-h-[370px]
              max-[700.001px]:min-h-[370px] max-[390.001px]:min-h-[350px] max-[480.001px]:block
              max-[480.001px]:min-h-[575px]
            `}
            data-reveal
          >
            <div className={`
              fw-bento-copy max-[480.001px]:[&_p]:max-w-[270px] relative z-[3] w-[48%] max-[1100.001px]:w-[55%]
              max-[900.001px]:w-[61%] max-[700.001px]:w-[52%] max-[390.001px]:w-[61%] max-[480.001px]:w-[100%]
            `}>
              <span className={`
                fw-feature-icon [&_.fw-icon]:w-[19px] [&_.fw-icon]:h-[19px]
                [&_.fw-icon]:[transition:transform_0.55s_cubic-bezier(0.2,_0.8,_0.2,_1)] grid place-items-center
                w-[35px] h-[35px] [border:1px_solid_var(--fw-border)] rounded-[10px] text-[color:var(--fw-blue)]
                mb-[21px] [background:var(--fw-surface)]
              `}>
                <Icon name="wallet" />
              </span>
              <h3>
                Tu marca.
                <br />
                En su bolsillo.
              </h3>
              <p>
                Logo, colores y personalidad. Crea una tarjeta tan reconocible
                como tu negocio.
              </p>
              <div
                className={`
                  fw-color-picker [&_button]:grid [&_button]:place-items-center [&_button]:w-[32px]
                  [&_button]:h-[32px] [&_button]:[border:3px_solid_var(--fw-bg)]
                  [&_button]:[outline:1px_solid_var(--fw-border)] [&_button]:rounded-full [&_button]:[color:white]
                  [&_button]:[background:var(--swatch)] [&_button]:[transition:outline-color_0.2s,_transform_0.2s]
                  [&_button:hover]:[transform:translateY(-2px)]
                  [&_button[aria-pressed=true]]:[outline-color:var(--swatch)] [&_.fw-icon]:w-[14px]
                  [&_.fw-icon]:h-[14px] flex gap-[8px] mt-[24px] mb-[8px]
                `}
                role="group"
                aria-label="Color de la tarjeta de ejemplo"
              >
                {CARD_COLORS.map(({ color, name }) => (
                  <button
                    key={color}
                    style={{ "--swatch": color } as CSSProperties}
                    aria-label={`Color ${name.toLowerCase()}`}
                    aria-pressed={cardColor === color}
                    onClick={() => setCardColor(color)}
                  >
                    {cardColor === color && <Icon name="check" />}
                  </button>
                ))}
              </div>
              <span className="fw-microcopy text-[color:var(--fw-muted)] text-[9px]">
                Pruébalo. Dale tu color.
              </span>
            </div>
            <div
              className={`
                fw-mini-wallet absolute w-[265px] h-[280px] right-[-34px] top-[70px] [transform:rotate(-11deg)]
                max-[1100.001px]:w-[235px] max-[1100.001px]:right-[-56px] max-[900.001px]:right-[-90px]
                max-[900.001px]:w-[230px] max-[900.001px]:top-[100px] max-[700.001px]:w-[240px]
                max-[700.001px]:right-[-55px] max-[700.001px]:top-[78px] max-[390.001px]:right-[-88px]
                max-[390.001px]:w-[224px] max-[390.001px]:top-[100px] max-[480.001px]:top-[auto]
                max-[480.001px]:bottom-[-35px] max-[480.001px]:right-[15px] max-[480.001px]:w-[245px]
                max-[480.001px]:h-[265px]
              `}
              style={
                {
                  "--demo-color": cardColor,
                  "--demo-ink": cardColor === "#D69E09" ? "#322609" : "#fff",
                  "--demo-stamp-ink":
                    cardColor === "#D69E09" ? "#705006" : cardColor,
                  "--demo-spark":
                    cardColor === "#D69E09" ? "#574C2F" : "#ffe39a",
                } as CSSProperties
              }
              aria-label="Vista previa del diseño de tarjeta"
            >
              <div className={`
                fw-wallet-back absolute [inset:8px_0_-8px] rounded-[22px]
                [background:linear-gradient(125deg,_#f0ce74,_#d69e09)] [transform:rotate(13deg)]
                [transition:transform_0.7s_cubic-bezier(0.2,_0.7,_0.2,_1)]
              `} />
              <div className={`
                fw-wallet-front [&_>_span]:flex [&_>_span]:justify-between [&_>_span]:items-center
                [&_>_span]:text-[13px] [&_>_span]:font-[700] [&_>_span_>_span]:text-[26px]
                [&_>_span_>_span]:[color:var(--demo-spark)] [&_strong]:block [&_strong]:[margin-block:19px_22px]
                [&_strong]:text-[23px] [&_strong]:leading-[1.3] [&_strong]:tracking-[-0.055em] [&_strong]:font-[600]
                [&_small]:text-[7px] [&_small]:tracking-[0.15em] max-[390.001px]:[&_strong]:text-[21px] relative
                h-full rounded-[22px] p-[28px] text-[color:var(--demo-ink)]
                [background:linear-gradient(125deg,_#ffffff22,_#00000020),_var(--demo-color)]
                [box-shadow:0_22px_35px_#07132226,_inset_0_1px_0_#ffffff50]
                [transition:transform_0.7s_cubic-bezier(0.2,_0.7,_0.2,_1),_background-color_0.3s]
                max-[1100.001px]:p-[24px]
              `}>
                <span>
                  tu negocio<span>✳</span>
                </span>
                <strong>
                  Los buenos
                  <br />
                  momentos suman.
                </strong>
                <div className={`
                  fw-mini-stamps [&_>_span]:w-[34px] [&_>_span]:h-[34px] [&_>_span]:grid [&_>_span]:place-items-center
                  [&_>_span]:rounded-full [&_>_span]:[border:1px_solid_#ffffff70]
                  [&_>_span:nth-child(-n_+_3)]:[color:var(--demo-stamp-ink)]
                  [&_>_span:nth-child(-n_+_3)]:[background:white] [&_.fw-icon]:w-[17px] [&_.fw-icon]:h-[17px]
                  max-[1100.001px]:[&_>_span]:w-[30px] max-[1100.001px]:[&_>_span]:h-[30px]
                  max-[390.001px]:[&_>_span]:w-[26px] max-[390.001px]:[&_>_span]:h-[26px] flex gap-[7px] mb-[22px]
                  max-[1100.001px]:gap-[6px]
                `}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i}>
                      <Icon name={i < 3 ? "star" : "gift"} />
                    </span>
                  ))}
                </div>
                <small>TU TARJETA DE FIDELIZACIÓN</small>
              </div>
            </div>
          </article>
          <article
            className={`
              fw-bento [&::after]:absolute [&::after]:[inset:0] [&::after]:z-[-1] [&::after]:pointer-events-none
              [&::after]:rounded-[inherit] [&::after]:[content:'']
              [&::after]:[background:linear-gradient(120deg,_#ffffff09,_transparent_40%)] [&_h3]:text-[26px]
              [&_h3]:leading-[1.3] [&_h3]:tracking-[-0.045em] [&_h3]:font-[750] [&_h3]:mb-[13px]
              [&_p]:[color:var(--fw-muted)] [&_p]:text-[14px] [&_p]:leading-[1.9] [&_p]:max-w-[300px]
              [&:hover]:[border-color:color-mix(in_srgb,_var(--fw-blue)_30%,_var(--fw-border))]
              [&:hover]:[box-shadow:inset_0_1px_0_#ffffff35,_0_10px_40px_#087bd70c]
              max-[1100.001px]:[&_h3]:text-[24px] max-[900.001px]:[&_h3]:text-[22px]
              max-[900.001px]:[&_p]:text-[11px] max-[700.001px]:[&_h3]:text-[26px]
              max-[700.001px]:[&_p]:text-[12px] max-[390.001px]:[&_h3]:text-[23px]
              max-[390.001px]:[&_p]:text-[11px] max-[480.001px]:[&_p]:text-[13px]
              [&:is(:hover,_:focus-within)_.fw-feature-icon_.fw-icon]:[transform:rotate(-14deg)_scale(1.14)]
              motion-reduce:[&:is(:hover,_:focus-within)_:is(.fw-wallet-front,_.fw-wallet-back,_.fw-feature-icon_.fw-icon)]:transform-none
              relative isolate overflow-hidden p-[34px] [border:1px_solid_var(--fw-border)] rounded-[22px]
              fw-bento-data [grid-column:span_5]
              [background:linear-gradient(_125deg,_color-mix(in_srgb,_var(--fw-surface)_95%,_transparent),_color-mix(in_srgb,_var(--fw-surface)_55%,_transparent)_)]
              [backdrop-filter:blur(18px)] [box-shadow:inset_0_1px_0_#ffffff24,_0_10px_30px_#13273804]
              [transition:border-color_0.25s,_box-shadow_0.25s] max-[1100.001px]:p-[27px] max-[700.001px]:p-[27px]
              max-[700.001px]:rounded-[18px] max-[390.001px]:p-[23px] max-[900.001px]:[grid-column:span_5]
              max-[700.001px]:min-h-[350px]
            `}
            data-reveal
          >
            <span className={`
              fw-feature-icon [&_.fw-icon]:w-[19px] [&_.fw-icon]:h-[19px]
              [&_.fw-icon]:[transition:transform_0.55s_cubic-bezier(0.2,_0.8,_0.2,_1)] grid place-items-center
              w-[35px] h-[35px] [border:1px_solid_var(--fw-border)] rounded-[10px] text-[color:var(--fw-blue)]
              mb-[21px] [background:var(--fw-surface)]
            `}>
              <Icon name="chart" />
            </span>
            <h3>
              Conoce a quienes
              <br />
              eligen volver.
            </h3>
            <p>
              Consulta visitas, sellos y canjes para entender mejor la relación
              con tus clientes.
            </p>
            <ActivityChart motionPaused={motionStopped} />
          </article>
          <article
            className={`
              fw-bento [&::after]:absolute [&::after]:[inset:0] [&::after]:z-[-1] [&::after]:pointer-events-none
              [&::after]:rounded-[inherit] [&::after]:[content:'']
              [&::after]:[background:linear-gradient(120deg,_#ffffff09,_transparent_40%)] [&_h3]:text-[26px]
              [&_h3]:leading-[1.3] [&_h3]:tracking-[-0.045em] [&_h3]:font-[750] [&_h3]:mb-[13px]
              [&_p]:[color:var(--fw-muted)] [&_p]:text-[14px] [&_p]:leading-[1.9] [&_p]:max-w-[300px]
              [&:hover]:[border-color:color-mix(in_srgb,_var(--fw-blue)_30%,_var(--fw-border))]
              [&:hover]:[box-shadow:inset_0_1px_0_#ffffff35,_0_10px_40px_#087bd70c]
              max-[1100.001px]:[&_h3]:text-[24px] max-[900.001px]:[&_h3]:text-[22px]
              max-[900.001px]:[&_p]:text-[11px] max-[700.001px]:[&_h3]:text-[26px]
              max-[700.001px]:[&_p]:text-[12px] max-[390.001px]:[&_h3]:text-[23px]
              max-[390.001px]:[&_p]:text-[11px] max-[480.001px]:[&_p]:text-[13px]
              [&:is(:hover,_:focus-within)_.fw-feature-icon_.fw-icon]:[transform:rotate(-14deg)_scale(1.14)]
              motion-reduce:[&:is(:hover,_:focus-within)_:is(.fw-wallet-front,_.fw-wallet-back,_.fw-feature-icon_.fw-icon)]:transform-none
              relative isolate overflow-hidden p-[34px] [border:1px_solid_var(--fw-border)] rounded-[22px]
              fw-bento-rewards [&_>_div:first-child]:max-w-[62%] [&_p]:max-w-[215px]
              max-[1100.001px]:[&_>_div:first-child]:max-w-[67%]
              max-[900.001px]:[&_>_div:first-child]:max-w-[100%] max-[900.001px]:[&_p]:max-w-[180px]
              max-[700.001px]:[&_>_div:first-child]:max-w-[65%] max-[480.001px]:[&_>_div:first-child]:max-w-[100%]
              max-[480.001px]:[&_p]:max-w-[260px]
              [&_.fw-gift-disc]:[animation:fw-gift-float_7s_ease-in-out_infinite]
              [&_.fw-reward-spark]:[animation:fw-spark-turn_12s_ease-in-out_infinite]
              [&_.fw-reward-ticket]:[animation:fw-card-hover_7s_ease-in-out_-3s_infinite]
              [&:hover_.fw-gift-disc_.fw-icon]:[transform:rotate(10deg)_scale(1.15)]
              [&:hover_.fw-gift-disc_.fw-icon]:[transition:transform_0.4s] [grid-column:span_5] min-h-[320px]
              [background:linear-gradient(_125deg,_color-mix(in_srgb,_var(--fw-surface)_95%,_transparent),_color-mix(in_srgb,_var(--fw-surface)_55%,_transparent)_)]
              [backdrop-filter:blur(18px)] [box-shadow:inset_0_1px_0_#ffffff24,_0_10px_30px_#13273804]
              [transition:border-color_0.25s,_box-shadow_0.25s] max-[1100.001px]:p-[27px] max-[700.001px]:p-[27px]
              max-[700.001px]:rounded-[18px] max-[390.001px]:p-[23px] max-[900.001px]:[grid-column:span_5]
              max-[900.001px]:min-h-[370px] max-[700.001px]:min-h-[310px] max-[480.001px]:min-h-[445px]
            `}
            data-reveal
          >
            <div>
              <span className={`
                fw-feature-icon [&_.fw-icon]:w-[19px] [&_.fw-icon]:h-[19px]
                [&_.fw-icon]:[transition:transform_0.55s_cubic-bezier(0.2,_0.8,_0.2,_1)] grid place-items-center
                w-[35px] h-[35px] [border:1px_solid_var(--fw-border)] rounded-[10px] text-[color:var(--fw-blue)]
                mb-[21px] [background:var(--fw-surface)]
              `}>
                <Icon name="gift" />
              </span>
              <h3>
                Premios que dan
                <br />
                ganas de volver.
              </h3>
              <p>
                Un café, un descuento o ese detalle especial. Tú decides qué
                vale una nueva visita.
              </p>
            </div>
            <div
              className={`
                fw-reward-visual absolute top-[100px] right-[4px] w-[180px] h-[200px] max-[1100.001px]:right-[-35px]
                max-[1100.001px]:[transform:scale(0.85)] max-[900.001px]:right-[-15px] max-[900.001px]:top-[auto]
                max-[900.001px]:bottom-[10px] max-[900.001px]:[transform:scale(0.63)]
                max-[900.001px]:[transform-origin:bottom_right] max-[700.001px]:top-[90px]
                max-[700.001px]:right-[-17px] max-[700.001px]:bottom-[auto] max-[700.001px]:[transform:scale(0.85)]
                max-[390.001px]:right-[-35px] max-[390.001px]:[transform:scale(0.7)] max-[480.001px]:top-[auto]
                max-[480.001px]:bottom-[2px] max-[480.001px]:right-[15px] max-[480.001px]:[transform:scale(0.85)]
              `}
              aria-hidden="true"
            >
              <div className="fw-reward-orbit absolute top-0 left-0 w-[180px] h-[180px] [border:1px_solid_#d69e0927] rounded-full" />
              <span className={`
                fw-gift-disc [&_.fw-icon]:w-[46px] [&_.fw-icon]:h-[46px] absolute top-[30px] left-[35px] w-[115px]
                h-[115px] grid place-items-center text-[#fff4c9] rounded-full
                [background:linear-gradient(140deg,_#f3cd5b,_#d69e09_60%,_#b68105)]
                [box-shadow:inset_0_0_0_5px_#ffe8a340,_8px_12px_24px_#d69e0928]
                [transform:rotate(-15deg)_rotateY(-20deg)]
              `}>
                <Icon name="gift" />
              </span>
              <span className="fw-reward-spark absolute top-[-10px] right-[20px] text-[#d69e09] text-[29px]">
                ✦
              </span>
              <span className={`
                fw-reward-ticket [&_.fw-icon]:w-[14px] [&_.fw-icon]:h-[14px] [&_.fw-icon]:[color:#b78208] absolute
                bottom-[20px] left-[12px] flex items-center gap-[7px] p-[11px_14px]
                [border:1px_solid_var(--fw-border)] rounded-[10px] text-[9px] font-bold whitespace-nowrap
                [background:var(--fw-surface)] [backdrop-filter:blur(10px)] [transform:rotate(-5deg)]
              `}>
                <Icon name="check" /> Recompensa lista
              </span>
            </div>
          </article>
          <article
            className={`
              fw-bento [&::after]:absolute [&::after]:[inset:0] [&::after]:z-[-1] [&::after]:pointer-events-none
              [&::after]:rounded-[inherit] [&::after]:[content:'']
              [&::after]:[background:linear-gradient(120deg,_#ffffff09,_transparent_40%)] [&_h3]:text-[26px]
              [&_h3]:leading-[1.3] [&_h3]:tracking-[-0.045em] [&_h3]:font-[750] [&_h3]:mb-[13px]
              [&_p]:[color:var(--fw-muted)] [&_p]:text-[14px] [&_p]:leading-[1.9] [&_p]:max-w-[300px]
              [&:hover]:[border-color:color-mix(in_srgb,_var(--fw-blue)_30%,_var(--fw-border))]
              [&:hover]:[box-shadow:inset_0_1px_0_#ffffff35,_0_10px_40px_#087bd70c]
              max-[1100.001px]:[&_h3]:text-[24px] max-[900.001px]:[&_h3]:text-[22px]
              max-[900.001px]:[&_p]:text-[11px] max-[700.001px]:[&_h3]:text-[26px]
              max-[700.001px]:[&_p]:text-[12px] max-[390.001px]:[&_h3]:text-[23px]
              max-[390.001px]:[&_p]:text-[11px] max-[480.001px]:[&_p]:text-[13px]
              [&:is(:hover,_:focus-within)_.fw-feature-icon_.fw-icon]:[transform:rotate(-14deg)_scale(1.14)]
              motion-reduce:[&:is(:hover,_:focus-within)_:is(.fw-wallet-front,_.fw-wallet-back,_.fw-feature-icon_.fw-icon)]:transform-none
              relative isolate overflow-hidden p-[34px] [border:1px_solid_var(--fw-border)] rounded-[22px]
              fw-bento-team [&_>_div:first-child]:w-[70%] [&_>_div:first-child]:relative
              [&_>_div:first-child]:z-[1] [&_.fw-text-link]:text-[10px] [&_.fw-text-link]:mt-[24px]
              max-[900.001px]:[&_>_div:first-child]:w-[90%] max-[700.001px]:[&_>_div:first-child]:w-[80%]
              max-[480.001px]:[&_>_div:first-child]:w-[100%]
              [&:is(:hover,_:focus-within)_.fw-team-center]:[box-shadow:0_0_0_7px_#087bd712,_0_10px_28px_#087bd71f]
              [grid-column:span_7] flex items-center
              [background:linear-gradient(_125deg,_color-mix(in_srgb,_var(--fw-surface)_95%,_transparent),_color-mix(in_srgb,_var(--fw-surface)_55%,_transparent)_)]
              [backdrop-filter:blur(18px)] [box-shadow:inset_0_1px_0_#ffffff24,_0_10px_30px_#13273804]
              [transition:border-color_0.25s,_box-shadow_0.25s] max-[1100.001px]:p-[27px] max-[700.001px]:p-[27px]
              max-[700.001px]:rounded-[18px] max-[390.001px]:p-[23px] max-[900.001px]:[grid-column:span_7]
              max-[700.001px]:min-h-[320px] max-[480.001px]:items-start max-[480.001px]:min-h-[480px]
              max-[350.001px]:min-h-[510px]
            `}
            data-reveal
          >
            <div>
              <span className={`
                fw-feature-icon [&_.fw-icon]:w-[19px] [&_.fw-icon]:h-[19px]
                [&_.fw-icon]:[transition:transform_0.55s_cubic-bezier(0.2,_0.8,_0.2,_1)] grid place-items-center
                w-[35px] h-[35px] [border:1px_solid_var(--fw-border)] rounded-[10px] text-[color:var(--fw-blue)]
                mb-[21px] [background:var(--fw-surface)]
              `}>
                <Icon name="users" />
              </span>
              <h3>
                Tu equipo conectado.
                <br />
                Tu negocio en una vista.
              </h3>
              <p>
                Administra tus locales y el acceso de tu equipo desde el mismo
                panel.
              </p>
              <a
                className={`
                  fw-text-link [&:hover]:[color:var(--fw-blue)] inline-flex items-center gap-[12px]
                  text-[color:var(--fw-text)] font-[750] text-[13px]
                `}
                href="#contacto"
              >
                Hablemos de tu negocio <Icon name="arrow" />
              </a>
            </div>
            <div
              className={`
                fw-team-visual absolute top-[44px] right-[-30px] w-[210px] h-[240px] max-[1100.001px]:right-[-68px]
                max-[900.001px]:right-[-90px] max-[900.001px]:top-[123px] max-[900.001px]:[transform:scale(0.8)]
                max-[700.001px]:right-[-62px] max-[700.001px]:top-[100px] max-[700.001px]:[transform:scale(0.8)]
                max-[480.001px]:top-[auto] max-[480.001px]:bottom-[-5px] max-[480.001px]:right-[5px]
                max-[480.001px]:[transform:scale(0.75)] max-[480.001px]:[transform-origin:bottom_right]
              `}
              aria-hidden="true"
            >
              <span className={`
                fw-team-node absolute grid place-items-center [border:1px_solid_var(--fw-border)] rounded-[14px]
                z-[1] fw-team-center [&_.fw-icon]:w-[30px] [&_.fw-icon]:h-[30px] [background:#087bd7]
                [box-shadow:inset_0_1px_0_#ffffff22,_0_8px_30px_#13273808]
                [animation:fw-node-float_8s_ease-in-out_infinite] top-[88px] left-[64px] [color:white] w-[66px]
                h-[66px] [transform:rotate(-8deg)]
              `}>
                <Icon name="wallet" />
              </span>
              <span className={`
                fw-team-node absolute grid place-items-center w-[51px] h-[51px] [border:1px_solid_var(--fw-border)]
                rounded-[14px] text-[color:var(--fw-blue)] z-[1] fw-team-a top-[5px] left-[8px]
                [background:var(--fw-surface)] [box-shadow:inset_0_1px_0_#ffffff22,_0_8px_30px_#13273808]
                [animation:fw-node-float_8s_ease-in-out_infinite] [transform:rotate(-9deg)] [animation-delay:-2s]
              `}>
                <Icon name="users" />
              </span>
              <span className={`
                fw-team-node absolute grid place-items-center w-[51px] h-[51px] [border:1px_solid_var(--fw-border)]
                rounded-[14px] text-[color:var(--fw-blue)] z-[1] fw-team-b top-[5px] right-0
                [background:var(--fw-surface)] [box-shadow:inset_0_1px_0_#ffffff22,_0_8px_30px_#13273808]
                [animation:fw-node-float_8s_ease-in-out_infinite] [transform:rotate(8deg)] [animation-delay:-5s]
              `}>
                <Icon name="cup" />
              </span>
              <span className={`
                fw-team-node absolute grid place-items-center w-[51px] h-[51px] [border:1px_solid_var(--fw-border)]
                rounded-[14px] z-[1] fw-team-c bottom-0 [background:var(--fw-surface)]
                [box-shadow:inset_0_1px_0_#ffffff22,_0_8px_30px_#13273808]
                [animation:fw-node-float_8s_ease-in-out_infinite] bottom-[0] right-[42px] [color:#d69e09]
                [transform:rotate(10deg)] [animation-delay:-3s]
              `}>
                <Icon name="star" />
              </span>
              <span className={`
                fw-team-line [&::after]:absolute [&::after]:top-[-2px] [&::after]:left-[0] [&::after]:w-[5px]
                [&::after]:h-[5px] [&::after]:rounded-full [&::after]:[content:'']
                [&::after]:[background:var(--fw-blue)] [&::after]:[box-shadow:0_0_7px_#087bd750]
                [&::after]:[animation:fw-connection-travel_3.8s_ease-in-out_infinite] absolute h-[1px] left-[95px]
                top-[123px] w-[110px] fw-line-a [background:var(--fw-border)] [transform-origin:left]
                [transform:rotate(-124deg)]
              `} />
              <span className={`
                fw-team-line [&::after]:absolute [&::after]:top-[-2px] [&::after]:left-[0] [&::after]:w-[5px]
                [&::after]:h-[5px] [&::after]:rounded-full [&::after]:[content:'']
                [&::after]:[background:var(--fw-blue)] [&::after]:[box-shadow:0_0_7px_#087bd750]
                [&::after]:[animation:fw-connection-travel_3.8s_ease-in-out_infinite] absolute h-[1px] left-[95px]
                top-[123px] w-[110px] fw-line-b [&::after]:[animation-delay:-1.2s] [background:var(--fw-border)]
                [transform-origin:left] [transform:rotate(-48deg)]
              `} />
              <span className={`
                fw-team-line [&::after]:absolute [&::after]:top-[-2px] [&::after]:left-[0] [&::after]:w-[5px]
                [&::after]:h-[5px] [&::after]:rounded-full [&::after]:[content:'']
                [&::after]:[background:var(--fw-blue)] [&::after]:[box-shadow:0_0_7px_#087bd750]
                [&::after]:[animation:fw-connection-travel_3.8s_ease-in-out_infinite] absolute h-[1px] left-[95px]
                top-[123px] w-[110px] fw-line-c [&::after]:[animation-delay:-2.4s] [&::after]:[background:#d69e09]
                [background:var(--fw-border)] [transform-origin:left] [transform:rotate(69deg)]
              `} />
            </div>
          </article>
        </div>
      </HomeContainer>
    </section>
  );
}
