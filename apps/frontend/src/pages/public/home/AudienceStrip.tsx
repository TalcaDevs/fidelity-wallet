import { HomeContainer } from "./HomeContainer";
import { HomeIcon as Icon } from "./HomeIcon";
export function AudienceStrip() {
  return (
    <div className="fw-audience-strip [border-block:1px_solid_var(--fw-border)]">
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
