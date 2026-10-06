import { HomeContainer } from "./HomeContainer";
import { FAQS } from "../constants/homeContent.constants.ts";
export function FaqSection() {
  return (
    <HomeContainer
      as="section"
      className={`
        fw-section py-[100px] fw-faq [&_h2]:text-[33px] [&_>_div_>_p]:[color:var(--fw-muted)]
        [&_>_div_>_p]:text-[14px] [&_>_div_>_p]:mt-[21px]
        [&_details]:[border-bottom:1px_solid_var(--fw-border)] [&_summary]:flex [&_summary]:items-center
        [&_summary]:justify-between [&_summary]:gap-[18px] [&_summary]:p-[22px_0] [&_summary]:list-none
        [&_summary]:cursor-pointer [&_summary]:text-[14px] [&_summary]:font-[700]
        [&_summary::-webkit-details-marker]:hidden [&_summary_>_span]:[color:var(--fw-muted)]
        [&_summary_>_span]:text-[23px] [&_summary_>_span]:font-[400]
        [&_summary_>_span]:[transition:transform_0.2s]
        [&_details[open]_summary_>_span]:[transform:rotate(45deg)] [&_details_p]:mb-[23px]
        [&_details_p]:pr-[25px] [&_details_p]:[color:var(--fw-muted)] [&_details_p]:text-[14px]
        [&_details_p]:leading-[1.85] max-[700.001px]:[&_h2]:text-[32px]
        max-[700.001px]:[&_summary]:text-[12px] max-[700.001px]:[&_>_div_>_p]:text-[12px] grid
        [grid-template-columns:1fr_1.15fr] gap-[80px] [border-top:1px_solid_var(--fw-border)] pt-[80px]
        max-[900.001px]:[padding-block:75px] max-[700.001px]:[padding-block:60px]
        max-[1100.001px]:gap-[45px] max-[700.001px]:[grid-template-columns:1fr] max-[700.001px]:gap-[20px]
      `}
      aria-labelledby="faq-title"
    >
      <div data-reveal>
        <span className={`
          fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold tracking-[0.16em]
          mb-[17px] max-[700.001px]:text-[8px] max-[700.001px]:mb-[14px]
        `}>
          ANTES DE DAR EL PRIMER PASO
        </span>
        <h2 id="faq-title">
          Buenas preguntas.
          <br />
          Respuestas simples
          <span className="fw-gold-text text-[#d69e09]">.</span>
        </h2>
        <p>
          Que empezar sea tan fácil
          <br />
          como sumar tu primer sello.
        </p>
      </div>
      <div className="fw-faq-items" data-reveal>
        {FAQS.map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </HomeContainer>
  );
}
