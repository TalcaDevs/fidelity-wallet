import { HomeContainer } from "./HomeContainer";
import { FAQS } from "./homeContent";
export function FaqSection() {
  return (
    <HomeContainer
      as="section"
      className="fw-section py-[100px] fw-faq grid [grid-template-columns:1fr_1.15fr] gap-[80px] [border-top:1px_solid_var(--fw-border)] pt-[80px]"
      aria-labelledby="faq-title"
    >
      <div data-reveal>
        <span className="fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold tracking-[0.16em] mb-[17px]">
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
