import { HomeContainer } from "./HomeContainer";
import { HomeIcon as Icon } from "./HomeIcon";
export function AudienceStrip() {
  return (
    <div
      className={`
        fw-audience-strip [&_>_div]:flex [&_>_div]:items-center [&_>_div]:justify-between
        [&_>_div]:gap-[30px] [&_>_div]:[padding-block:25px] [&_>_div_>_span]:text-[10px]
        [&_>_div_>_span]:[color:var(--fw-muted)] [&_>_div_>_div]:flex
        [&_>_div_>_div]:gap-[clamp(20px,_5vw,_65px)] [&_>_div_>_div]:[color:var(--fw-muted)]
        [&_>_div_>_div]:font-[650] [&_>_div_>_div]:text-[13px] [&_>_div_>_div_>_span]:flex
        [&_>_div_>_div_>_span]:items-center [&_>_div_>_div_>_span]:gap-[10px]
        max-[900.001px]:[&_>_div]:flex-col max-[900.001px]:[&_>_div]:gap-[17px]
        max-[900.001px]:[&_>_div_>_div]:w-[100%] max-[900.001px]:[&_>_div_>_div]:justify-between
        max-[700.001px]:[&_>_div]:[padding-block:22px] max-[700.001px]:[&_>_div_>_div]:gap-[13px]
        max-[700.001px]:[&_>_div_>_div]:flex-wrap max-[700.001px]:[&_>_div_>_div]:justify-center
        max-[700.001px]:[&_>_div_>_div]:text-[10px] max-[700.001px]:[&_>_div_>_div_>_span]:gap-[5px]
        max-[700.001px]:[&_.fw-icon]:w-[17px] max-[700.001px]:[&_.fw-icon]:h-[17px]
        max-[700.001px]:[&_>_div_>_span]:text-[9px] [border-block:1px_solid_var(--fw-border)]
        [background:var(--fw-soft)]
      `}
    >
      <HomeContainer className="">
        <span>Hecho para negocios como el tuyo</span>
        <div>
          <span>
            <Icon name="cup" /> Cafeterías
          </span>
          <span>
            <Icon name="gift" /> Gastronomía
          </span>
          <span>
            <Icon name="star" /> Belleza
          </span>
          <span>
            <Icon name="wallet" /> Comercios
          </span>
        </div>
      </HomeContainer>
    </div>
  );
}
