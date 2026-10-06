import { HomeContainer } from "./HomeContainer";
import { HomeBrand } from "./HomeBrand";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../../components/routing/routePaths";
import { HomeIcon as Icon } from "./HomeIcon";
export function HomeFooter() {
  return (
    <HomeContainer as="footer" className="fw-footer relative z-[1] pb-[24px]">
      <div
        className={`
        fw-footer-top [&_>_a:last-child]:ml-[auto] [&_>_a:last-child]:text-[10px]
        max-[700.001px]:[&_>_a:last-child]:ml-[0] flex items-center gap-[44px] pb-[39px]
        max-[700.001px]:flex-wrap max-[700.001px]:gap-[24px] max-[700.001px]:pb-[28px]
      `}
      >
        <HomeBrand label="Fidelity Wallet, volver al inicio" />
        <p
          className={`
        text-[10px] [color:var(--fw-muted)] [border-left:1px_solid_var(--fw-border)] pl-[30px]
        max-[700.001px]:ml-[auto] max-[700.001px]:pl-[20px] max-[700.001px]:text-[9px]
        max-[390.001px]:text-[8px] max-[390.001px]:pl-[12px]
      `}
        >
          Pequeños gestos.
          <br />
          Clientes que vuelven.
        </p>
        <a
          className={`
        fw-text-link [&:hover]:[color:var(--fw-blue)] inline-flex items-center gap-[12px]
        text-[color:var(--fw-text)] font-[750] text-[13px]
      `}
          href="#contacto"
        >
          Construyamos algo bueno <Icon name="diagonal" />
        </a>
      </div>
      <div
        className={`
        fw-footer-bottom [&_a]:[color:var(--fw-muted)] [&_a]:flex [&_a]:gap-[5px] [&_a]:items-center
        [&_a:hover]:[color:var(--fw-blue)] [&_.fw-icon]:w-[12px] [&_.fw-icon]:h-[12px] flex
        justify-between gap-[20px] pt-[24px] [border-top:1px_solid_var(--fw-border)] text-[9px]
        text-[color:var(--fw-muted)] max-[700.001px]:flex-wrap max-[700.001px]:gap-[14px]
        max-[700.001px]:text-[8px]
      `}
      >
        <span>© {new Date().getFullYear()} Fidelity Wallet</span>
        <span>Hecho para conectar.</span>
        <div className="flex gap-[22px] max-[700.001px]:w-[100%] max-[700.001px]:gap-[20px]">
          <Link to={ROUTES.terms}>Términos y condiciones</Link>
          <Link to={ROUTES.login}>
            Entrar al panel <Icon name="diagonal" />
          </Link>
        </div>
      </div>
    </HomeContainer>
  );
}
