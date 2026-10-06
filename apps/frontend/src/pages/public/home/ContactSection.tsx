import { HomeContainer } from "./HomeContainer";
import { HomeIcon as Icon } from "./HomeIcon";
import { WHATSAPP_URL, EMAIL_URL } from "./homeContent";
export function ContactSection() {
  return (
    <HomeContainer
      as="section"
      className="fw-contact-wrap pb-[80px]"
      id="contacto"
      aria-labelledby="contact-title"
    >
      <div
        className="fw-contact relative isolate overflow-hidden text-[white] p-[62px] rounded-[25px]"
        data-reveal
      >
        <div
          className="fw-contact-orbit absolute w-[520px] h-[520px] right-[-235px] top-[-50px] [border:1px_solid_#ffffff20] rounded-full"
          aria-hidden="true"
        />
        <span
          className="fw-contact-star absolute right-[90px] top-[57px] text-[#f0c354] text-[155px] font-normal leading-[1]"
          aria-hidden="true"
        >
          ✳
        </span>
        <div className="fw-contact-content relative z-[2]">
          <span className="fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold tracking-[0.16em] mb-[17px]">
            HAGAMOS QUE VUELVAN
          </span>
          <h2 id="contact-title">
            Tu próxima visita
            <br />
            empieza aquí<span>.</span>
          </h2>
          <p>
            Cuéntanos sobre tu negocio. Te mostramos cómo llevar
            <br className="fw-desktop-break" /> tu programa de fidelización al
            siguiente nivel.
          </p>
          <div className="fw-contact-actions flex flex-wrap gap-[14px] mt-[29px]">
            <a
              className="fw-button inline-flex items-center justify-center gap-[13px] min-h-[52px] [padding:15px_22px] [border:1px_solid_transparent] rounded-[10px] font-[750] text-[12px] leading-[1.4] fw-button-white text-[#075a9d]"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="whatsapp" /> Hablemos por WhatsApp{" "}
              <Icon name="diagonal" />
            </a>
            <a
              className="fw-button inline-flex items-center justify-center gap-[13px] min-h-[52px] [padding:15px_22px] [border:1px_solid_transparent] rounded-[10px] font-[750] text-[12px] leading-[1.4] fw-button-outline text-[white] [border-color:#ffffff50]"
              href={EMAIL_URL}
            >
              <Icon name="mail" /> Escríbenos por correo
            </a>
          </div>
          <span className="fw-contact-note block text-[#c4e5ff] text-[9px] mt-[21px]">
            Conversemos. Las buenas relaciones empiezan así.
          </span>
        </div>
      </div>
    </HomeContainer>
  );
}
