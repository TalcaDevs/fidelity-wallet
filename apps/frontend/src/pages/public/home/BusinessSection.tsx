import { HomeContainer } from "./HomeContainer";
import { SectionHeading } from "./SectionHeading";
import { useState } from "react";
import { HomeIcon as Icon } from "./HomeIcon";
import { BUSINESS_EXAMPLES } from "./homeContent";
export function BusinessSection() {
  const [businessIndex, setBusinessIndex] = useState(0);
  const business = BUSINESS_EXAMPLES[businessIndex];
  return (
    <HomeContainer
      as="section"
      className="fw-section py-[100px] fw-business"
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
        className="fw-business-switch flex gap-[10px] mb-[30px] flex-wrap"
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
        className="fw-business-example grid [grid-template-columns:230px_1fr_70px] gap-[50px] items-center p-[40px] [border:1px_solid_var(--fw-border)] rounded-[22px] relative isolate overflow-hidden"
        data-reveal
      >
        <div
          className="fw-business-emblem flex flex-col items-center justify-center gap-[20px] w-[195px] h-[195px] [border:1px_solid_#d69e0930] rounded-full text-[#ac7a07] relative"
          aria-hidden="true"
        >
          <i className="fw-business-orbit absolute inset-[-12px] [border:1px_dashed_#d69e0938] rounded-full pointer-events-none" />
          <Icon key={business.name} name={business.icon} />
          <span>
            BUENOS MOMENTOS
            <br />
            QUE SE REPITEN
          </span>
        </div>
        <div className="fw-business-copy" aria-live="polite" aria-atomic="true">
          <span className="fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold tracking-[0.16em] mb-[17px]">
            {business.name}
          </span>
          <h3 key={`${business.name}-title`}>{business.title}</h3>
          <p key={`${business.name}-description`}>{business.description}</p>
          <div
            className="fw-example-reward flex items-center flex-wrap gap-[9px] text-[10px] mt-[22px] font-[650]"
            key={`${business.name}-reward`}
          >
            <Icon name="gift" />
            {business.reward}
            <span>Ejemplo</span>
          </div>
        </div>
        <a
          className="fw-business-arrow grid place-items-center w-[54px] h-[54px] rounded-full text-[color:var(--fw-blue)] [border:1px_solid_var(--fw-border)]"
          href="#contacto"
          aria-label={`Consultar por Fidelity Wallet para ${business.name.toLowerCase()}`}
        >
          <Icon name="diagonal" />
        </a>
      </div>
    </HomeContainer>
  );
}
