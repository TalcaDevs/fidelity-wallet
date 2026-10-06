import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "motion/react";
import { useTheme } from "../../hooks/useTheme";
import { ROUTES } from "../../components/routing/routePaths";
import { LoyaltyCardStage } from "./home/LoyaltyCardStage";
import { ActivityChart } from "./home/ActivityChart";
import { HomeAtmosphere } from "./home/HomeAtmosphere";
import { LocationsStory } from "./home/LocationsStory";
import { PricingSection } from "./home/PricingSection";
import "./home/Home.css";
import "./home/HomeMotion.css";

const ICONS = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  diagonal: "M6 18 18 6M6 6h12v12",
  check: "m5 12 4 4L19 6",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  wallet:
    "M19 8V5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7m17 6h-5v4h5m-3-2h.01",
  qr: "M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm12 0h2v2h-2v-2Zm4 4h2v2h-2v-2Zm0-6h2v2m-6 4v2h2",
  gift: "M3 8h18v4H3V8Zm2 4v9h14v-9m-7-4v13m0-13H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z",
  chart: "M4 3v17h17M8 15v-4m5 4V7m5 8V4",
  cup: "M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm13 1h2a3 3 0 0 1 0 6h-2M7 3v2m4-2v2m4-2v2",
  users:
    "M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M8.5 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM16 3a4 4 0 0 1 0 8",
  mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  whatsapp:
    "M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7a8.5 8.5 0 1 1 16.3-3.8ZM8 7.5c0 4 4.5 8.5 8.5 8.5l1-2.5-3-1-1 1c-1.3-.5-2.5-1.7-3-3l1-1-1-3L8 7.5Z",
  sun: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5",
  moon: "M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z",
  replay: "M3 10a9 9 0 1 1 1.8 8M3 4v6h6",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  pause: "M8 5v14M16 5v14",
  play: "m8 5 11 7-11 7V5Z",
} as const;

function Icon({
  name,
  className = "",
}: {
  name: keyof typeof ICONS;
  className?: string;
}) {
  return (
    <svg
      className={`fw-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const BUSINESS_EXAMPLES = [
  {
    name: "Cafeterías",
    title: "Su café favorito. Ahora con una razón más.",
    description:
      "Acompaña ese ritual de cada mañana con sellos que acercan a tus clientes a su próximo café de regalo.",
    reward: "10 sellos = un café de regalo",
    icon: "cup",
  },
  {
    name: "Restaurantes",
    title: "Que el próximo encuentro sea en tu mesa.",
    description:
      "Reconoce a quienes eligen tu cocina y crea una recompensa que les dé ganas de regresar.",
    reward: "8 visitas = un postre de la casa",
    icon: "gift",
  },
  {
    name: "Belleza",
    title: "Un detalle para quienes siempre te eligen.",
    description:
      "Transforma cada visita a tu salón o barbería en un paso hacia un beneficio especial.",
    reward: "6 visitas = un beneficio especial",
    icon: "star",
  },
  {
    name: "Tiendas",
    title: "De una compra a una relación que crece.",
    description:
      "Dale a tu comunidad una tarjeta de tu marca y premia la constancia con beneficios que tú defines.",
    reward: "5 sellos = una sorpresa de tu tienda",
    icon: "wallet",
  },
] as const;

const FAQS = [
  [
    "¿Mis clientes tienen que instalar una app?",
    "No. Acceden desde el QR de tu local y guardan su tarjeta en la billetera del celular. El alta solicita los datos que hayas definido para tu programa.",
  ],
  [
    "¿Puedo usar el logo y los colores de mi negocio?",
    "Sí. Puedes personalizar el diseño de la tarjeta con tu identidad y definir los sellos y las recompensas de tu programa desde el panel.",
  ],
  [
    "¿Qué necesito para registrar una visita?",
    "Tu equipo puede escanear la tarjeta desde un celular con cámara y conexión a internet. También existe la búsqueda manual de clientes como alternativa.",
  ],
  [
    "¿Funciona si tengo más de un local?",
    "Puedes administrar locales y miembros del equipo de tu marca. Conversemos sobre tu operación para ayudarte a configurar el programa adecuado.",
  ],
] as const;

const WHATSAPP_URL = `https://wa.me/56940453861?text=${encodeURIComponent("¡Hola! Quiero conocer Fidelity Wallet para mi negocio. ¿Podemos conversar?")}`;
const EMAIL_URL = `mailto:mezasuarez03@gmail.com?subject=${encodeURIComponent("Quiero Fidelity Wallet para mi negocio")}`;

export function Home() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [introReady, setIntroReady] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cardColor, setCardColor] = useState("#087BD7");
  const [businessIndex, setBusinessIndex] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const reducedMotion = useReducedMotion();
  const motionStopped = motionPaused || !!reducedMotion || pageHidden;
  const homeRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const onCardReady = useCallback(() => setIntroReady(true), []);
  const business = BUSINESS_EXAMPLES[businessIndex];

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const scenes = homeRef.current?.querySelectorAll("[data-motion-scene]");
    if (!scenes || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.target.classList.toggle(
            "fw-scene-visible",
            entry.isIntersecting,
          ),
        );
      },
      { rootMargin: "80px" },
    );
    scenes.forEach((scene) => observer.observe(scene));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nodes =
      homeRef.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (
      !nodes ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fw-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    nodes.forEach((node) => {
      node.classList.add("fw-reveal");
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Keep copy available if the browser interrupts the entrance animation.
    const timeout = window.setTimeout(onCardReady, 3200);
    return () => window.clearTimeout(timeout);
  }, [onCardReady, replayKey]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const replay = () => {
    setIntroReady(false);
    setReplayKey((key) => key + 1);
  };

  return (
    <div className="fw-home" ref={homeRef} data-motion-paused={motionStopped}>
      <HomeAtmosphere motionPaused={motionStopped} />
      <a className="fw-skip" href="#contenido">
        Saltar al contenido
      </a>
      <HomeHeader
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        menuToggleRef={menuToggleRef}
      />
      <MotionControl
        motionPaused={motionPaused}
        reducedMotion={!!reducedMotion}
        onToggle={() => setMotionPaused((paused) => !paused)}
      />
      <main id="contenido">
        <section
          className={`fw-hero ${introReady ? "is-ready" : ""}`}
          aria-labelledby="home-title"
          data-motion-scene
        >
          <div className="fw-hero-grid" aria-hidden="true" />
          <div className="fw-container fw-hero-layout">
            <div className="fw-hero-copy">
              <span className="fw-eyebrow">
                <span className="fw-status-dot" /> PEQUEÑOS GESTOS. GRANDES
                CONEXIONES.
              </span>
              <h1 id="home-title">
                Que vuelvan.
                <br />
                <span className="fw-blue-text">Una y otra</span>
                <br />
                <span className="fw-blue-text">
                  vez<span className="fw-gold-text">.</span>
                </span>
              </h1>
              <p className="fw-hero-description">
                Convierte cada visita en una razón para volver. La tarjeta de
                fidelización de tu negocio, directo al Wallet de tus clientes.
              </p>
              <div
                className="fw-hero-journey"
                aria-label="El recorrido de tus clientes"
              >
                <span>
                  <Icon name="wallet" /> Guarda su tarjeta
                </span>
                <i aria-hidden="true">→</i>
                <span>
                  <Icon name="star" /> Suma visitas
                </span>
                <i aria-hidden="true">→</i>
                <span>
                  <Icon name="gift" /> Recibe su premio
                </span>
              </div>
              <div className="fw-hero-ctas">
                <a className="fw-button fw-button-primary" href="#contacto">
                  Quiero mi tarjeta <Icon name="arrow" />
                </a>
                <a className="fw-text-link" href="#como-funciona">
                  Descubre cómo <span className="fw-play-icon">↗</span>
                </a>
              </div>
              <div className="fw-hero-note">
                <span className="fw-check-circle">
                  <Icon name="check" />
                </span>{" "}
                Sin apps extra. Sin tarjetas perdidas.
              </div>
            </div>
            <div className="fw-hero-art">
              <div className="fw-orbit fw-orbit-one" aria-hidden="true" />
              <div className="fw-orbit fw-orbit-two" aria-hidden="true" />
              <div className="fw-orbit-star" aria-hidden="true">
                ✳
              </div>
              <LoyaltyCardStage
                onReady={onCardReady}
                replayKey={replayKey}
                motionPaused={motionStopped}
              />
              <button className="fw-replay" onClick={replay}>
                <Icon name="replay" /> Ver demo completa
              </button>
            </div>
          </div>
          <div className="fw-container fw-hero-bottom">
            <span>
              EL BUEN SERVICIO SE RECUERDA.
              <br />
              <strong>DALES UNA RAZÓN MÁS PARA VOLVER.</strong>
            </span>
            <a href="#como-funciona" className="fw-scroll-link">
              Conoce la experiencia <span>↓</span>
            </a>
          </div>
        </section>
        <div className="fw-audience-strip">
          <div className="fw-container">
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
          </div>
        </div>

        <section
          className="fw-container fw-section"
          id="como-funciona"
          aria-labelledby="how-title"
        >
          <div className="fw-section-heading" data-reveal>
            <div>
              <span className="fw-section-label">01 — ASÍ DE SIMPLE</span>
              <h2 id="how-title">
                Cómo funciona
                <span className="fw-gold-text" aria-hidden="true">
                  .
                </span>
              </h2>
            </div>
            <p>
              Una experiencia sencilla para tus clientes.
              <br />
              Un nuevo hábito para tu negocio.
            </p>
          </div>
          <ol className="fw-steps">
            <li data-reveal>
              <div className="fw-step-top">
                <span className="fw-step-icon">
                  <Icon name="qr" />
                </span>
                <span className="fw-step-number">01</span>
              </div>
              <h3>Escanea. Guarda. Listo.</h3>
              <p>
                Tu cliente escanea el QR del local y guarda su tarjeta digital
                en el Wallet de su celular.
              </p>
              <span className="fw-step-tag">
                Sin descargar otra app <Icon name="check" />
              </span>
            </li>
            <li data-reveal>
              <div className="fw-step-top">
                <span className="fw-step-icon">
                  <Icon name="star" />
                </span>
                <span className="fw-step-number">02</span>
              </div>
              <h3>Cada visita suma.</h3>
              <p>
                Tu equipo escanea la tarjeta y registra un sello. Cada encuentro
                queda un paso más cerca del premio.
              </p>
              <span className="fw-step-tag">
                Desde el celular de tu equipo <Icon name="check" />
              </span>
            </li>
            <li data-reveal>
              <div className="fw-step-top">
                <span className="fw-step-icon fw-step-gold">
                  <Icon name="gift" />
                </span>
                <span className="fw-step-number">03</span>
              </div>
              <h3>Un premio. Otra sonrisa.</h3>
              <p>
                Al reunir los sellos necesarios, tu cliente puede canjear la
                recompensa que definiste para su tarjeta.
              </p>
              <span className="fw-step-tag">
                Tus recompensas, tus reglas <Icon name="check" />
              </span>
            </li>
          </ol>
        </section>

        <section
          className="fw-experience"
          id="posibilidades"
          aria-labelledby="experience-title"
          data-motion-scene
        >
          <div className="fw-container fw-section">
            <div className="fw-section-heading" data-reveal>
              <div>
                <span className="fw-section-label">
                  02 — DISEÑADO PARA CONECTAR
                </span>
                <h2 id="experience-title">
                  Mucho más
                  <br />
                  que un sello<span className="fw-gold-text">.</span>
                </h2>
              </div>
              <p>
                Tu identidad, tus premios y tus clientes.
                <br />
                Todo en una experiencia que se siente tuya.
              </p>
            </div>
            <div className="fw-bento-grid">
              <article className="fw-bento fw-bento-brand" data-reveal>
                <div className="fw-bento-copy">
                  <span className="fw-feature-icon">
                    <Icon name="wallet" />
                  </span>
                  <h3>
                    Tu marca.
                    <br />
                    En su bolsillo.
                  </h3>
                  <p>
                    Logo, colores y personalidad. Crea una tarjeta tan
                    reconocible como tu negocio.
                  </p>
                  <div
                    className="fw-color-picker"
                    role="group"
                    aria-label="Color de la tarjeta de ejemplo"
                  >
                    {[
                      { color: "#087BD7", name: "Azul" },
                      { color: "#2F4557", name: "Pizarra" },
                      { color: "#D69E09", name: "Dorado" },
                    ].map(({ color, name }) => (
                      <button
                        key={color}
                        style={{ "--swatch": color } as CSSProperties}
                        aria-label={`Color ${name.toLowerCase()}`}
                        aria-pressed={cardColor === color}
                        onClick={() => setCardColor(color)}
                      >
                        {cardColor === color && <Icon name="check" />}
                      </button>
                    ))}
                  </div>
                  <span className="fw-microcopy">Pruébalo. Dale tu color.</span>
                </div>
                <div
                  className="fw-mini-wallet"
                  style={
                    {
                      "--demo-color": cardColor,
                      "--demo-ink":
                        cardColor === "#D69E09" ? "#322609" : "#fff",
                      "--demo-stamp-ink":
                        cardColor === "#D69E09" ? "#705006" : cardColor,
                      "--demo-spark":
                        cardColor === "#D69E09" ? "#574C2F" : "#ffe39a",
                    } as CSSProperties
                  }
                  aria-label="Vista previa del diseño de tarjeta"
                >
                  <div className="fw-wallet-back" />
                  <div className="fw-wallet-front">
                    <span>
                      tu negocio<span>✳</span>
                    </span>
                    <strong>
                      Los buenos
                      <br />
                      momentos suman.
                    </strong>
                    <div className="fw-mini-stamps">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i}>
                          <Icon name={i < 3 ? "star" : "gift"} />
                        </span>
                      ))}
                    </div>
                    <small>TU TARJETA DE FIDELIZACIÓN</small>
                  </div>
                </div>
              </article>
              <article className="fw-bento fw-bento-data" data-reveal>
                <span className="fw-feature-icon">
                  <Icon name="chart" />
                </span>
                <h3>
                  Conoce a quienes
                  <br />
                  eligen volver.
                </h3>
                <p>
                  Consulta visitas, sellos y canjes para entender mejor la
                  relación con tus clientes.
                </p>
                <ActivityChart motionPaused={motionStopped} />
              </article>
              <article className="fw-bento fw-bento-rewards" data-reveal>
                <div>
                  <span className="fw-feature-icon">
                    <Icon name="gift" />
                  </span>
                  <h3>
                    Premios que dan
                    <br />
                    ganas de volver.
                  </h3>
                  <p>
                    Un café, un descuento o ese detalle especial. Tú decides qué
                    vale una nueva visita.
                  </p>
                </div>
                <div className="fw-reward-visual" aria-hidden="true">
                  <div className="fw-reward-orbit" />
                  <span className="fw-gift-disc">
                    <Icon name="gift" />
                  </span>
                  <span className="fw-reward-spark">✦</span>
                  <span className="fw-reward-ticket">
                    <Icon name="check" /> Recompensa lista
                  </span>
                </div>
              </article>
              <article className="fw-bento fw-bento-team" data-reveal>
                <div>
                  <span className="fw-feature-icon">
                    <Icon name="users" />
                  </span>
                  <h3>
                    Tu equipo conectado.
                    <br />
                    Tu negocio en una vista.
                  </h3>
                  <p>
                    Administra tus locales y el acceso de tu equipo desde el
                    mismo panel.
                  </p>
                  <a className="fw-text-link" href="#contacto">
                    Hablemos de tu negocio <Icon name="arrow" />
                  </a>
                </div>
                <div className="fw-team-visual" aria-hidden="true">
                  <span className="fw-team-node fw-team-center">
                    <Icon name="wallet" />
                  </span>
                  <span className="fw-team-node fw-team-a">
                    <Icon name="users" />
                  </span>
                  <span className="fw-team-node fw-team-b">
                    <Icon name="cup" />
                  </span>
                  <span className="fw-team-node fw-team-c">
                    <Icon name="star" />
                  </span>
                  <span className="fw-team-line fw-line-a" />
                  <span className="fw-team-line fw-line-b" />
                  <span className="fw-team-line fw-line-c" />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          className="fw-container fw-section fw-business"
          id="para-quien"
          aria-labelledby="business-title"
          data-motion-scene
        >
          <div className="fw-section-heading" data-reveal>
            <div>
              <span className="fw-section-label">
                03 — EL PRÓXIMO FAVORITO DEL BARRIO
              </span>
              <h2 id="business-title">
                Para quién es
                <span className="fw-gold-text" aria-hidden="true">
                  .
                </span>
              </h2>
            </div>
            <p>
              Para negocios que saben que un cliente
              <br />
              puede ser mucho más que una visita.
            </p>
          </div>
          <div
            className="fw-business-switch"
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
          <div className="fw-business-example" data-reveal>
            <div className="fw-business-emblem" aria-hidden="true">
              <i className="fw-business-orbit" />
              <Icon key={business.name} name={business.icon} />
              <span>
                BUENOS MOMENTOS
                <br />
                QUE SE REPITEN
              </span>
            </div>
            <div
              className="fw-business-copy"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="fw-section-label">{business.name}</span>
              <h3 key={`${business.name}-title`}>{business.title}</h3>
              <p key={`${business.name}-description`}>{business.description}</p>
              <div
                className="fw-example-reward"
                key={`${business.name}-reward`}
              >
                <Icon name="gift" />
                {business.reward}
                <span>Ejemplo</span>
              </div>
            </div>
            <a
              className="fw-business-arrow"
              href="#contacto"
              aria-label={`Consultar por Fidelity Wallet para ${business.name.toLowerCase()}`}
            >
              <Icon name="diagonal" />
            </a>
          </div>
        </section>

        <LocationsStory motionPaused={motionStopped} />
        <PricingSection motionPaused={motionStopped} />

        <section
          className="fw-container fw-section fw-faq"
          aria-labelledby="faq-title"
        >
          <div data-reveal>
            <span className="fw-section-label">
              ANTES DE DAR EL PRIMER PASO
            </span>
            <h2 id="faq-title">
              Buenas preguntas.
              <br />
              Respuestas simples<span className="fw-gold-text">.</span>
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
        </section>

        <section
          className="fw-container fw-contact-wrap"
          id="contacto"
          aria-labelledby="contact-title"
        >
          <div className="fw-contact" data-reveal>
            <div className="fw-contact-orbit" aria-hidden="true" />
            <span className="fw-contact-star" aria-hidden="true">
              ✳
            </span>
            <div className="fw-contact-content">
              <span className="fw-section-label">HAGAMOS QUE VUELVAN</span>
              <h2 id="contact-title">
                Tu próxima visita
                <br />
                empieza aquí<span>.</span>
              </h2>
              <p>
                Cuéntanos sobre tu negocio. Te mostramos cómo llevar
                <br className="fw-desktop-break" /> tu programa de fidelización
                al siguiente nivel.
              </p>
              <div className="fw-contact-actions">
                <a
                  className="fw-button fw-button-white"
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="whatsapp" /> Hablemos por WhatsApp{" "}
                  <Icon name="diagonal" />
                </a>
                <a className="fw-button fw-button-outline" href={EMAIL_URL}>
                  <Icon name="mail" /> Escríbenos por correo
                </a>
              </div>
              <span className="fw-contact-note">
                Conversemos. Las buenas relaciones empiezan así.
              </span>
            </div>
          </div>
        </section>
      </main>
      <footer className="fw-container fw-footer">
        <div className="fw-footer-top">
          <a
            className="fw-brand"
            href="#"
            aria-label="Fidelity Wallet, volver al inicio"
          >
            <span className="fw-brand-mark">
              <Icon name="wallet" />
            </span>
            <span>
              fidelity<span className="fw-brand-light">wallet</span>
              <span className="fw-brand-dot">.</span>
            </span>
          </a>
          <p>
            Pequeños gestos.
            <br />
            Clientes que vuelven.
          </p>
          <a className="fw-text-link" href="#contacto">
            Construyamos algo bueno <Icon name="diagonal" />
          </a>
        </div>
        <div className="fw-footer-bottom">
          <span>© {new Date().getFullYear()} Fidelity Wallet</span>
          <span>Hecho para conectar.</span>
          <div>
            <Link to={ROUTES.terms}>Términos y condiciones</Link>
            <Link to={ROUTES.login}>
              Entrar al panel <Icon name="diagonal" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomeHeader({
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
    <header className="fw-header">
      <div className="fw-container fw-nav">
        <a className="fw-brand" href="#" aria-label="Fidelity Wallet, inicio">
          <span className="fw-brand-mark">
            <Icon name="wallet" />
          </span>
          <span>
            fidelity<span className="fw-brand-light">wallet</span>
            <span className="fw-brand-dot">.</span>
          </span>
        </a>
        <nav
          className={`fw-nav-links ${menuOpen ? "is-open" : ""}`}
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
        <div className="fw-nav-actions">
          <button
            className="fw-icon-button"
            onClick={toggleDarkMode}
            aria-label={
              isDarkMode ? "Activar modo claro" : "Activar modo oscuro"
            }
          >
            <Icon name={isDarkMode ? "sun" : "moon"} />
          </button>
          <Link className="fw-login" to={ROUTES.login}>
            Entrar al panel <Icon name="diagonal" />
          </Link>
          <button
            ref={menuToggleRef}
            className="fw-icon-button fw-menu-toggle"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-controls="home-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </div>
    </header>
  );
}

function MotionControl({
  motionPaused,
  reducedMotion,
  onToggle,
}: {
  motionPaused: boolean;
  reducedMotion: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="fw-motion-control"
      onClick={onToggle}
      aria-label={motionPaused ? "Reanudar animaciones" : "Pausar animaciones"}
      aria-pressed={motionPaused}
      title={
        reducedMotion
          ? "Movimiento reducido según tu preferencia del sistema"
          : undefined
      }
    >
      <Icon name={motionPaused || reducedMotion ? "play" : "pause"} />
      <span>{motionPaused ? "Reanudar movimiento" : "Pausar movimiento"}</span>
    </button>
  );
}
