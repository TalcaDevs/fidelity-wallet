import type { HomeHeaderProps } from "../types/homeComponent.types.ts";
import { HomeContainer } from "./HomeContainer";
import { HomeBrand } from "./HomeBrand";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../../components/routing/routePaths";
import { HomeIcon as Icon } from "./HomeIcon";
export function HomeHeader({
  menuOpen,
  setMenuOpen,
  isDarkMode,
  toggleDarkMode,
  menuToggleRef,
}: HomeHeaderProps) {
  return (
    <header
      className={`
        fw-header sticky top-0 z-[30] [border-bottom:1px_solid_var(--fw-border)]
        [background:color-mix(in_srgb,_var(--fw-bg)_85%,_transparent)] [backdrop-filter:blur(24px)]
      `}
    >
      <HomeContainer
        className={`
        fw-nav h-[86px] flex items-center justify-between gap-[24px] max-[1100.001px]:gap-[18px]
        max-[700.001px]:h-[73px] max-[700.001px]:gap-[10px] max-[480.001px]:gap-[6px]
      `}
      >
        <HomeBrand label="Fidelity Wallet, inicio" />
        <nav
          className={`
        fw-nav-links [&_a:hover]:[color:var(--fw-blue)] max-[900.001px]:[&.is-open]:flex
        max-[900.001px]:[&.is-open]:absolute max-[900.001px]:[&.is-open]:top-[77px]
        max-[900.001px]:[&.is-open]:left-[24px] max-[900.001px]:[&.is-open]:right-[24px]
        max-[900.001px]:[&.is-open]:flex-col max-[900.001px]:[&.is-open]:[align-items:stretch]
        max-[900.001px]:[&.is-open]:gap-[0] max-[900.001px]:[&.is-open]:p-[10px_23px]
        max-[900.001px]:[&.is-open]:rounded-[15px]
        max-[900.001px]:[&.is-open]:[border:1px_solid_var(--fw-border)]
        max-[900.001px]:[&.is-open]:[background:var(--fw-bg)]
        max-[900.001px]:[&.is-open]:[box-shadow:0_18px_30px_#06152422]
        max-[900.001px]:[&_a:last-child]:[border:0] max-[700.001px]:[&.is-open]:top-[68px]
        max-[700.001px]:[&.is-open]:left-[16px] max-[700.001px]:[&.is-open]:right-[16px]
        max-[900.001px]:[&.is-open_a]:text-[13px] flex items-center gap-[19px] max-[1100.001px]:gap-[12px]
        max-[900.001px]:hidden
      ${menuOpen ? "is-open" : ""}

      `}
          id="home-navigation"
          aria-label="Navegación principal"
          onClick={() => setMenuOpen(false)}
        >
          <a
            className={`
        [color:var(--fw-muted)] text-[11px] font-[650] [transition:color_0.2s] max-[900.001px]:p-[16px_0]
        max-[900.001px]:[border-bottom:1px_solid_var(--fw-border)] max-[1100.001px]:text-[10px]
      `}
            href="#como-funciona"
          >
            Cómo funciona
          </a>
          <a
            className={`
        [color:var(--fw-muted)] text-[11px] font-[650] [transition:color_0.2s] max-[900.001px]:p-[16px_0]
        max-[900.001px]:[border-bottom:1px_solid_var(--fw-border)] max-[1100.001px]:text-[10px]
      `}
            href="#posibilidades"
          >
            La experiencia
          </a>
          <a
            className={`
        [color:var(--fw-muted)] text-[11px] font-[650] [transition:color_0.2s] max-[900.001px]:p-[16px_0]
        max-[900.001px]:[border-bottom:1px_solid_var(--fw-border)] max-[1100.001px]:text-[10px]
      `}
            href="#para-quien"
          >
            Para tu negocio
          </a>
          <a
            className={`
        [color:var(--fw-muted)] text-[11px] font-[650] [transition:color_0.2s] max-[900.001px]:p-[16px_0]
        max-[900.001px]:[border-bottom:1px_solid_var(--fw-border)] max-[1100.001px]:text-[10px]
      `}
            href="#sucursales"
          >
            Sucursales
          </a>
          <a
            className={`
        [color:var(--fw-muted)] text-[11px] font-[650] [transition:color_0.2s] max-[900.001px]:p-[16px_0]
        max-[900.001px]:[border-bottom:1px_solid_var(--fw-border)] max-[1100.001px]:text-[10px]
      `}
            href="#planes"
          >
            Planes
          </a>
          <a
            className={`
        [color:var(--fw-muted)] text-[11px] font-[650] [transition:color_0.2s] hidden
        max-[900.001px]:p-[16px_0] max-[900.001px]:[border-bottom:1px_solid_var(--fw-border)]
        max-[900.001px]:flex max-[900.001px]:justify-between max-[900.001px]:[color:var(--fw-blue)]
        max-[1100.001px]:text-[10px] fw-mobile-contact
      `}
            href="#contacto"
          >
            Hablemos <Icon name="arrow" />
          </a>
        </nav>
        <div
          className={`
        fw-nav-actions flex items-center gap-[12px] max-[700.001px]:gap-[3px] max-[350.001px]:gap-[0]
      `}
        >
          <button
            className={`
        fw-icon-button [&:hover]:[color:var(--fw-blue)] [&:hover]:[background:var(--fw-soft)] w-[40px]
        h-[40px] [border:0] rounded-[12px] text-[color:var(--fw-muted)] grid place-items-center
        [background:transparent] max-[700.001px]:w-[34px] max-[700.001px]:h-[38px]
        max-[390.001px]:w-[30px] max-[350.001px]:w-[28px]
      `}
            onClick={toggleDarkMode}
            aria-label={
              isDarkMode ? "Activar modo claro" : "Activar modo oscuro"
            }
          >
            <Icon name={isDarkMode ? "sun" : "moon"} />
          </button>
          <Link
            className={`
        fw-login [&:hover]:[border-color:var(--fw-blue)] [&_.fw-icon]:w-[16px] [&_.fw-icon]:h-[16px]
        max-[700.001px]:[&_.fw-icon]:w-[13px] max-[390.001px]:[&_.fw-icon]:hidden flex items-center
        gap-[14px] text-[color:var(--fw-text)] [border:1px_solid_var(--fw-border)] rounded-[9px]
        p-[11px_17px] text-[12px] font-bold [transition:border-color_0.2s] max-[700.001px]:p-[9px_12px]
        max-[700.001px]:text-[10px] max-[700.001px]:gap-[5px] max-[390.001px]:p-[8px]
        max-[390.001px]:text-[9px] max-[480.001px]:whitespace-nowrap
      `}
            to={ROUTES.login}
          >
            Entrar al panel <Icon name="diagonal" />
          </Link>
          <button
            ref={menuToggleRef}
            className={`
        fw-icon-button [&:hover]:[color:var(--fw-blue)] [&:hover]:[background:var(--fw-soft)] w-[40px]
        h-[40px] [border:0] rounded-[12px] text-[color:var(--fw-muted)] place-items-center fw-menu-toggle
        [background:transparent] max-[700.001px]:w-[34px] max-[700.001px]:h-[38px]
        max-[390.001px]:w-[30px] max-[350.001px]:w-[28px] hidden max-[900.001px]:grid
      `}
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
