import { HomeContainer } from "./HomeContainer";
import { SectionHeading } from "./SectionHeading";
import { useState, type CSSProperties } from "react";
import { HomeIcon as Icon } from "./HomeIcon";
import { ActivityChart } from "./ActivityChart";
export function ExperienceSection({
  motionStopped,
}: {
  motionStopped: boolean;
}) {
  const [cardColor, setCardColor] = useState("#087BD7");
  return (
    <section
      className="fw-experience [border-block:1px_solid_var(--fw-border)] relative isolate"
      id="posibilidades"
      aria-labelledby="experience-title"
      data-motion-scene
    >
      <HomeContainer className="fw-section py-[100px]">
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
        <div className="fw-bento-grid grid [grid-template-columns:repeat(12,_minmax(0,_1fr))] gap-[20px]">
          <article
            className="fw-bento relative isolate overflow-hidden p-[34px] [border:1px_solid_var(--fw-border)] rounded-[22px] fw-bento-brand [grid-column:span_7] min-h-[380px] flex items-center"
            data-reveal
          >
            <div className="fw-bento-copy relative z-[3] w-[48%]">
              <span className="fw-feature-icon grid place-items-center w-[35px] h-[35px] [border:1px_solid_var(--fw-border)] rounded-[10px] text-[color:var(--fw-blue)] mb-[21px]">
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
                className="fw-color-picker flex gap-[8px] mt-[24px] mb-[8px]"
                role="group"
                aria-label="Color de la tarjeta de ejemplo"
              >
                {[
                  { color: "#087BD7", name: "Azul" },
                  { color: "#2F4557", name: "Pizarra" },
                  { color: "#D69E09", name: "Dorado" },
                ].map(({ color, name }) => (
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
              className="fw-mini-wallet absolute w-[265px] h-[280px] right-[-34px] top-[70px]"
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
              <div className="fw-wallet-back absolute [inset:8px_0_-8px] rounded-[22px]" />
              <div className="fw-wallet-front relative h-full rounded-[22px] p-[28px] text-[color:var(--demo-ink)]">
                <span>
                  tu negocio<span>✳</span>
                </span>
                <strong>
                  Los buenos
                  <br />
                  momentos suman.
                </strong>
                <div className="fw-mini-stamps flex gap-[7px] mb-[22px]">
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
            className="fw-bento relative isolate overflow-hidden p-[34px] [border:1px_solid_var(--fw-border)] rounded-[22px] fw-bento-data [grid-column:span_5]"
            data-reveal
          >
            <span className="fw-feature-icon grid place-items-center w-[35px] h-[35px] [border:1px_solid_var(--fw-border)] rounded-[10px] text-[color:var(--fw-blue)] mb-[21px]">
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
            className="fw-bento relative isolate overflow-hidden p-[34px] [border:1px_solid_var(--fw-border)] rounded-[22px] fw-bento-rewards [grid-column:span_5] min-h-[320px]"
            data-reveal
          >
            <div>
              <span className="fw-feature-icon grid place-items-center w-[35px] h-[35px] [border:1px_solid_var(--fw-border)] rounded-[10px] text-[color:var(--fw-blue)] mb-[21px]">
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
              className="fw-reward-visual absolute top-[100px] right-[4px] w-[180px] h-[200px]"
              aria-hidden="true"
            >
              <div className="fw-reward-orbit absolute top-0 left-0 w-[180px] h-[180px] [border:1px_solid_#d69e0927] rounded-full" />
              <span className="fw-gift-disc absolute top-[30px] left-[35px] w-[115px] h-[115px] grid place-items-center text-[#fff4c9] rounded-full">
                <Icon name="gift" />
              </span>
              <span className="fw-reward-spark absolute top-[-10px] right-[20px] text-[#d69e09] text-[29px]">
                ✦
              </span>
              <span className="fw-reward-ticket absolute bottom-[20px] left-[12px] flex items-center gap-[7px] [padding:11px_14px] [border:1px_solid_var(--fw-border)] rounded-[10px] text-[9px] font-bold whitespace-nowrap">
                <Icon name="check" /> Recompensa lista
              </span>
            </div>
          </article>
          <article
            className="fw-bento relative isolate overflow-hidden p-[34px] [border:1px_solid_var(--fw-border)] rounded-[22px] fw-bento-team [grid-column:span_7] flex items-center"
            data-reveal
          >
            <div>
              <span className="fw-feature-icon grid place-items-center w-[35px] h-[35px] [border:1px_solid_var(--fw-border)] rounded-[10px] text-[color:var(--fw-blue)] mb-[21px]">
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
                className="fw-text-link inline-flex items-center gap-[12px] text-[color:var(--fw-text)] text-[12px] font-[750]"
                href="#contacto"
              >
                Hablemos de tu negocio <Icon name="arrow" />
              </a>
            </div>
            <div
              className="fw-team-visual absolute top-[44px] right-[-30px] w-[210px] h-[240px]"
              aria-hidden="true"
            >
              <span className="fw-team-node absolute grid place-items-center w-[51px] h-[51px] [border:1px_solid_var(--fw-border)] rounded-[14px] text-[color:var(--fw-blue)] z-[1] fw-team-center top-[88px] left-[64px] text-[white] w-[66px] h-[66px]">
                <Icon name="wallet" />
              </span>
              <span className="fw-team-node absolute grid place-items-center w-[51px] h-[51px] [border:1px_solid_var(--fw-border)] rounded-[14px] text-[color:var(--fw-blue)] z-[1] fw-team-a top-[5px] left-[8px]">
                <Icon name="users" />
              </span>
              <span className="fw-team-node absolute grid place-items-center w-[51px] h-[51px] [border:1px_solid_var(--fw-border)] rounded-[14px] text-[color:var(--fw-blue)] z-[1] fw-team-b top-[5px] right-0">
                <Icon name="cup" />
              </span>
              <span className="fw-team-node absolute grid place-items-center w-[51px] h-[51px] [border:1px_solid_var(--fw-border)] rounded-[14px] text-[color:var(--fw-blue)] z-[1] fw-team-c bottom-0 right-[42px] text-[#d69e09]">
                <Icon name="star" />
              </span>
              <span className="fw-team-line absolute h-[1px] left-[95px] top-[123px] w-[110px] fw-line-a" />
              <span className="fw-team-line absolute h-[1px] left-[95px] top-[123px] w-[110px] fw-line-b" />
              <span className="fw-team-line absolute h-[1px] left-[95px] top-[123px] w-[110px] fw-line-c" />
            </div>
          </article>
        </div>
      </HomeContainer>
    </section>
  );
}
