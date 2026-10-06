import { HomeHeader } from "./home/HomeHeader";
import { MotionControl } from "./home/MotionControl";
import { HomeFooter } from "./home/HomeFooter";
import { ContactSection } from "./home/ContactSection";
import { FaqSection } from "./home/FaqSection";
import { BusinessSection } from "./home/BusinessSection";
import { ExperienceSection } from "./home/ExperienceSection";
import { HowItWorksSection } from "./home/HowItWorksSection";
import { AudienceStrip } from "./home/AudienceStrip";
import { HeroSection } from "./home/HeroSection";
import { useHomeController } from "./home/useHomeController";
import { HomeAtmosphere } from "./home/HomeAtmosphere";
import { LocationsStory } from "./home/LocationsStory";
import { PricingSection } from "./home/PricingSection";
import "./home/Home.css";
import "./home/HomeMotion.css";

export function Home() {
  const {
    isDarkMode,
    toggleDarkMode,
    introReady,
    replayKey,
    menuOpen,
    setMenuOpen,
    motionPaused,
    setMotionPaused,
    reducedMotion,
    motionStopped,
    homeRef,
    menuToggleRef,
    onCardReady,
    replay,
  } = useHomeController();

  return (
    <div
      className="fw-home relative isolate"
      ref={homeRef}
      data-motion-paused={motionStopped}
    >
      <HomeAtmosphere motionPaused={motionStopped} />
      <a
        className="fw-skip fixed left-[16px] top-[-100px] z-[100] [padding:12px_20px] text-[white] rounded-[8px]"
        href="#contenido"
      >
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
        <HeroSection
          introReady={introReady}
          replayKey={replayKey}
          motionStopped={motionStopped}
          onCardReady={onCardReady}
          replay={replay}
        />

        <AudienceStrip />

        <HowItWorksSection />

        <ExperienceSection motionStopped={motionStopped} />

        <BusinessSection />

        <LocationsStory motionPaused={motionStopped} />
        <PricingSection motionPaused={motionStopped} />

        <FaqSection />

        <ContactSection />
      </main>
      <HomeFooter />
    </div>
  );
}
