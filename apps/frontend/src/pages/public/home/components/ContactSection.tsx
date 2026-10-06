import { HomeContainer } from "./HomeContainer";
import { HomeIcon as Icon } from "./HomeIcon";
import { WHATSAPP_URL, EMAIL_URL } from "../constants/homeContent.constants.ts";
export function ContactSection() {
  return (
    <HomeContainer
      as="section"
      className="fw-contact-wrap pb-[80px] max-[700.001px]:pb-[45px]"
      id="contacto"
      aria-labelledby="contact-title"
    >
      <div
        className={`
        fw-contact [&::after]:absolute [&::after]:[inset:0] [&::after]:z-[-1]
        [&::after]:pointer-events-none [&::after]:[content:'']
        [&::after]:[background:radial-gradient(ellipse_at_82%_25%,_#40acff55,_transparent_40%)]
        [&_:focus-visible]:[outline-color:#f0c354] relative isolate overflow-hidden text-[white] p-[62px]
        rounded-[25px] [background:linear-gradient(110deg,_#066bbd,_#087bd7_53%,_#0861ae)]
        max-[900.001px]:p-[45px] max-[700.001px]:p-[32px_25px] max-[700.001px]:rounded-[20px]
      `}
        data-reveal
      >
        <div
          className={`
        fw-contact-orbit absolute w-[520px] h-[520px] right-[-235px] top-[-50px]
        [border:1px_solid_#ffffff20] rounded-full [box-shadow:0_0_0_55px_#ffffff04,_0_0_0_110px_#ffffff04]
        max-[700.001px]:right-[-375px]
      `}
          aria-hidden="true"
        />
        <span
          className={`
        fw-contact-star absolute right-[90px] top-[57px] text-[#f0c354] text-[155px] font-normal
        leading-[1] [transform:rotate(12deg)] max-[1100.001px]:right-[35px] max-[1100.001px]:text-[135px]
        max-[900.001px]:right-[30px] max-[900.001px]:top-[70px] max-[900.001px]:text-[105px]
        max-[700.001px]:right-[19px] max-[700.001px]:top-[20px] max-[700.001px]:text-[40px]
        max-[700.001px]:[opacity:0.65]
      `}
          aria-hidden="true"
        >
          ✳
        </span>
        <div className="fw-contact-content relative z-[2]">
          <span
            className={`
        [color:#c4e5ff] fw-section-label block text-[color:var(--fw-blue)] text-[9px] font-extrabold
        tracking-[0.16em] mb-[17px] max-[700.001px]:text-[8px] max-[700.001px]:mb-[14px]
      `}
          >
            HAGAMOS QUE VUELVAN
          </span>
          <h2
            id="contact-title"
            className={`
        text-[clamp(36px,_4vw,_53px)] [color:white] max-[700.001px]:text-[38px]
        max-[390.001px]:text-[33px] text-[clamp(32px,_3.2vw,_46px)] leading-[1.16] font-[750]
        tracking-[-0.05em] max-[700.001px]:text-[35px]
      `}
          >
            Tu próxima visita
            <br />
            empieza aquí<span className="[color:#f0c354]">.</span>
          </h2>
          <p className="[color:#d0e7fc] text-[14px] mt-[20px] max-[700.001px]:text-[12px] max-[700.001px]:max-w-[315px]">
            Cuéntanos sobre tu negocio. Te mostramos cómo llevar
            <br className="fw-desktop-break max-[700.001px]:hidden" /> tu
            programa de fidelización al siguiente nivel.
          </p>
          <div
            className={`
        fw-contact-actions flex flex-wrap gap-[14px] mt-[29px] max-[900.001px]:gap-[10px]
        max-[700.001px]:flex-col max-[700.001px]:[align-items:stretch] max-[700.001px]:gap-[12px]
      `}
          >
            <a
              className={`
        max-[900.001px]:p-[13px_16px] max-[900.001px]:text-[11px] max-[700.001px]:text-[12px]
        max-[700.001px]:min-h-[52px] fw-button [&:hover]:[transform:translateY(-3px)]
        group-data-[reduced-motion=true]/home:[&:hover]:transform-none inline-flex items-center
        justify-center gap-[13px] min-h-[52px] p-[15px_22px] [border:1px_solid_transparent] rounded-[10px]
        font-[750] leading-[1.4] fw-button-white [&:hover]:[box-shadow:0_10px_20px_#003c6930]
        text-[#075a9d] [transition:transform_0.2s,_box-shadow_0.2s,_background_0.2s] text-[13px]
        [background:white]
      `}
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="whatsapp" /> Hablemos por WhatsApp{" "}
              <Icon name="diagonal" />
            </a>
            <a
              className={`
        max-[900.001px]:p-[13px_16px] max-[900.001px]:text-[11px] max-[700.001px]:text-[12px]
        max-[700.001px]:min-h-[52px] fw-button [&:hover]:[transform:translateY(-3px)]
        group-data-[reduced-motion=true]/home:[&:hover]:transform-none inline-flex items-center
        justify-center gap-[13px] min-h-[52px] p-[15px_22px] [border:1px_solid_transparent] rounded-[10px]
        font-[750] leading-[1.4] fw-button-outline [&:hover]:[background:#ffffff15]
        [transition:transform_0.2s,_box-shadow_0.2s,_background_0.2s] text-[13px] [color:white]
        [border-color:#ffffff50] [background:#ffffff05]
      `}
              href={EMAIL_URL}
            >
              <Icon name="mail" /> Escríbenos por correo
            </a>
          </div>
          <span
            className={`
        fw-contact-note block text-[#c4e5ff] text-[9px] mt-[21px] max-[700.001px]:text-[8px]
        max-[700.001px]:text-center
      `}
          >
            Conversemos. Las buenas relaciones empiezan así.
          </span>
        </div>
      </div>
    </HomeContainer>
  );
}
