import { HomeContainer } from "./HomeContainer";
import { FAQS } from "../constants/homeContent.constants.ts";
export function FaqSection() {
  return (
    <HomeContainer
      as="section"
      className={`
        fw-section py-[100px] fw-faq [&_summary::-webkit-details-marker]:hidden
        [&_details[open]_summary_>_span]:[transform:rotate(45deg)] grid [grid-template-columns:1fr_1.15fr]
        gap-[80px] [border-top:1px_solid_var(--fw-border)] pt-[80px] max-[900.001px]:[padding-block:75px]
        max-[700.001px]:[padding-block:60px] max-[1100.001px]:gap-[45px]
        max-[700.001px]:[grid-template-columns:1fr] max-[700.001px]:gap-[20px]
      `}
      aria-labelledby="faq-title"
    >
      <div data-reveal>
        <span
          className={`
        fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold tracking-[0.16em]
        mb-[17px] max-[700.001px]:text-[8px] max-[700.001px]:mb-[14px]
      `}
        >
          ANTES DE DAR EL PRIMER PASO
        </span>
        <h2
          id="faq-title"
          className={`
        text-[33px] max-[700.001px]:text-[32px] text-[clamp(32px,_3.2vw,_46px)] leading-[1.16] font-[750]
        tracking-[-0.05em] max-[700.001px]:text-[35px]
      `}
        >
          Buenas preguntas.
          <br />
          Respuestas simples
          <span className="fw-gold-text text-[#d69e09]">.</span>
        </h2>
        <p className="[color:var(--fw-muted)] text-[14px] mt-[21px] max-[700.001px]:text-[12px]">
          Que empezar sea tan fácil
          <br />
          como sumar tu primer sello.
        </p>
      </div>
      <div className="fw-faq-items" data-reveal>
        {FAQS.map(([question, answer]) => (
          <details
            className="[border-bottom:1px_solid_var(--fw-border)]"
            key={question}
          >
            <summary
              className={`
        flex items-center justify-between gap-[18px] p-[22px_0] list-none cursor-pointer text-[14px]
        font-[700] max-[700.001px]:text-[12px]
      `}
            >
              {question}
              <span
                className="[color:var(--fw-muted)] text-[23px] font-[400] [transition:transform_0.2s]"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <p className="mb-[23px] pr-[25px] [color:var(--fw-muted)] text-[14px] leading-[1.85]">
              {answer}
            </p>
          </details>
        ))}
      </div>
    </HomeContainer>
  );
}
