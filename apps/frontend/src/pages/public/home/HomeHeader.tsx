import { HomeContainer } from "./HomeContainer";
import { HomeBrand } from "./HomeBrand";
import type { RefObject } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../components/routing/routePaths";
import { HomeIcon as Icon } from "./HomeIcon";
export function HomeHeader({
  menuOpen,
  setMenuOpen,
  isDarkMode,
  toggleDarkMode,
  menuToggleRef,
}: {
  menuOpen: boolean;
  setMenuOpen: (open: boolean | ((value: boolean) => boolean)) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  menuToggleRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <header className="fw-header sticky top-0 z-[30] [border-bottom:1px_solid_var(--fw-border)]">
      <HomeContainer className="fw-nav h-[86px] flex items-center justify-between gap-[24px]">
        <HomeBrand label="Fidelity Wallet, inicio" />
        <nav
          className={`fw-nav-links flex items-center gap-[19px] ${menuOpen ? "is-open" : ""}`}
          id="home-navigation"
          aria-label="Navegación principal"
          onClick={() => setMenuOpen(false)}
        >
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#posibilidades">La experiencia</a>
          <a href="#para-quien">Para tu negocio</a>
          <a href="#sucursales">Sucursales</a>
          <a href="#planes">Planes</a>
          <a className="fw-mobile-contact" href="#contacto">
            Hablemos <Icon name="arrow" />
          </a>
        </nav>
        <div className="fw-nav-actions flex items-center gap-[12px]">
          <button
            className="fw-icon-button w-[40px] h-[40px] [border:0] rounded-[12px] text-[color:var(--fw-muted)] grid place-items-center"
            onClick={toggleDarkMode}
            aria-label={
              isDarkMode ? "Activar modo claro" : "Activar modo oscuro"
            }
          >
            <Icon name={isDarkMode ? "sun" : "moon"} />
          </button>
          <Link
            className="fw-login flex items-center gap-[14px] text-[color:var(--fw-text)] [border:1px_solid_var(--fw-border)] rounded-[9px] [padding:11px_17px] text-[12px] font-bold"
            to={ROUTES.login}
          >
            Entrar al panel <Icon name="diagonal" />
          </Link>
          <button
            ref={menuToggleRef}
            className="fw-icon-button w-[40px] h-[40px] [border:0] rounded-[12px] text-[color:var(--fw-muted)] grid place-items-center fw-menu-toggle"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-controls="home-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </HomeContainer>
    </header>
  );
}
