import { HomeContainer } from "./HomeContainer";
import { HomeBrand } from "./HomeBrand";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../components/routing/routePaths";
import { HomeIcon as Icon } from "./HomeIcon";
export function HomeFooter() {
  return (
    <HomeContainer as="footer" className="fw-footer pb-[24px]">
      <div className="fw-footer-top flex items-center gap-[44px] pb-[39px]">
        <HomeBrand label="Fidelity Wallet, volver al inicio" />
        <p>
          Pequeños gestos.
          <br />
          Clientes que vuelven.
        </p>
        <a
          className="fw-text-link inline-flex items-center gap-[12px] text-[color:var(--fw-text)] text-[12px] font-[750]"
          href="#contacto"
        >
          Construyamos algo bueno <Icon name="diagonal" />
        </a>
      </div>
      <div className="fw-footer-bottom flex justify-between gap-[20px] pt-[24px] [border-top:1px_solid_var(--fw-border)] text-[9px] text-[color:var(--fw-muted)]">
        <span>© {new Date().getFullYear()} Fidelity Wallet</span>
        <span>Hecho para conectar.</span>
        <div>
          <Link to={ROUTES.terms}>Términos y condiciones</Link>
          <Link to={ROUTES.login}>
            Entrar al panel <Icon name="diagonal" />
          </Link>
        </div>
      </div>
    </HomeContainer>
  );
}
