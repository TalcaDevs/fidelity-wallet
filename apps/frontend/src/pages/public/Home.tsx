import "./home/styles/homeAnimations.css";
import { HomeHeader } from "./home/components/HomeHeader";
import { MotionControl } from "./home/components/MotionControl";
import { HomeFooter } from "./home/components/HomeFooter";
import { ContactSection } from "./home/components/ContactSection";
import { FaqSection } from "./home/components/FaqSection";
import { BusinessSection } from "./home/components/BusinessSection";
import { ExperienceSection } from "./home/components/ExperienceSection";
import { HowItWorksSection } from "./home/components/HowItWorksSection";
import { AudienceStrip } from "./home/components/AudienceStrip";
import { HeroSection } from "./home/components/HeroSection";
import { useHomeController } from "./home/hooks/useHomeController";
import { HomeAtmosphere } from "./home/components/HomeAtmosphere";
import { LocationsStory } from "./home/components/LocationsStory";
import { PricingSection } from "./home/components/PricingSection";

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
      className={`
        fw-home [&_.fw-reveal]:[transform:translateY(20px)]
        [&_.fw-reveal]:[transition:opacity_0.6s_ease,transform_0.6s_cubic-bezier(0.2,0.65,0.2,1)]
        [&_.fw-reveal.fw-visible]:opacity-100 [&_.fw-reveal.fw-visible]:transform-none
        [&_.fw-reveal:focus-within]:opacity-100 [&_.fw-reveal:focus-within]:transform-none
        motion-reduce:[&_.fw-reveal]:transform-none motion-reduce:[&_.fw-reveal]:opacity-100
        [&_*]:box-border [&_*::before]:box-border [&_*::after]:box-border
        [&_:where(button,_a)]:[-webkit-tap-highlight-color:transparent] [&_a]:[text-decoration:none]
        [&_button]:cursor-pointer [&_button]:[font-family:inherit]
        [&_:where(a,_button,_summary):focus-visible]:[outline:3px_solid_var(--fw-blue)]
        [&_:where(a,_button,_summary):focus-visible]:[outline-offset:5px] [&_:where(h1,_h2,_h3,_p)]:m-[0]
        [&_:where(section[id],_main[id])]:[scroll-margin-top:100px] [&_::selection]:[color:#fff]
        [&_::selection]:[background:#087bd7] [&_h1]:text-[clamp(55px,_5.6vw,_79px)] [&_h1]:font-[800]
        [&_h1]:tracking-[-0.065em] [&_h1]:leading-[1.07] [&_h1]:mt-[26px] [&_h1]:mb-[24px]
        [&_:where(h2)]:text-[clamp(32px,_3.2vw,_46px)] [&_:where(h2)]:leading-[1.16]
        [&_:where(h2)]:font-[750] [&_:where(h2)]:tracking-[-0.05em] min-[1500px]:[&_h1]:text-[88px]
        max-[1100.001px]:[&_h1]:text-[64px] max-[900.001px]:[&_h1]:text-[56px]
        max-[700.001px]:[&_h1]:text-[clamp(49px,_11vw,_72px)] max-[700.001px]:[&_h1]:[margin-block:24px]
        max-[700.001px]:[&_h1_br:nth-of-type(2)]:hidden
        max-[700.001px]:[&_h1_>_.fw-blue-text:last-child::before]:[content:'_']
        max-[700.001px]:[&_:where(h2)]:text-[35px] max-[390.001px]:[&_h1]:text-[46px]
        motion-reduce:[&_*]:[animation-duration:0.01ms]! motion-reduce:[&_*]:[transition-duration:0.01ms]!
        motion-reduce:[&_*]:[scroll-behavior:auto]! motion-reduce:[&_*]:[animation:none]!
        motion-reduce:[&_*::before]:[animation-duration:0.01ms]!
        motion-reduce:[&_*::before]:[transition-duration:0.01ms]!
        motion-reduce:[&_*::before]:[scroll-behavior:auto]! motion-reduce:[&_*::before]:[animation:none]!
        motion-reduce:[&_*::after]:[animation-duration:0.01ms]!
        motion-reduce:[&_*::after]:[transition-duration:0.01ms]!
        motion-reduce:[&_*::after]:[scroll-behavior:auto]! motion-reduce:[&_*::after]:[animation:none]!
        [&_>_main]:relative [&_>_main]:z-[1] [&_>_footer]:relative [&_>_footer]:z-[1]
        [&_[data-motion-scene]:not(.fw-scene-visible)_*]:[animation-play-state:paused]
        [&_[data-motion-scene]:not(.fw-scene-visible)_*::before]:[animation-play-state:paused]
        [&_[data-motion-scene]:not(.fw-scene-visible)_*::after]:[animation-play-state:paused]
        [&_[data-motion-scene]:not(.fw-scene-visible)::before]:[animation-play-state:paused]
        [&[data-motion-paused=true]_*]:[animation-play-state:paused]!
        [&[data-motion-paused=true]_*::before]:[animation-play-state:paused]!
        [&[data-motion-paused=true]_*::after]:[animation-play-state:paused]!
        [&[data-motion-paused=true]_.fw-bento:is(:hover,_:focus-within)_:is(.fw-wallet-front,_.fw-wallet-back,_.fw-feature-icon_.fw-icon)]:transform-none
        [&[data-motion-paused=true]_.fw-business-copy_>_:is(h3,_p,_.fw-example-reward)]:[animation:none]
        [&[data-motion-paused=true]_.fw-business-emblem_>_.fw-icon]:[animation:none] relative isolate
        [color:var(--fw-text)] text-[15px] leading-[1.65] [overflow-x:clip]
        [-webkit-font-smoothing:antialiased] [--fw-bg:#f7fafc] [--fw-text:#193346] [--fw-muted:#556c7d]
        [--fw-blue:#087bd7] [--fw-surface:rgb(255_255_255_/_78%)] [--fw-border:rgb(47_69_87_/_13%)]
        [--fw-soft:#edf3f8] [background:var(--fw-bg)] [font-family:Manrope_Variable,_Segoe_UI,_sans-serif]
        dark:[--fw-bg:#0c1824] dark:[--fw-text:#f0f4f8] dark:[--fw-muted:#a1b0bf] dark:[--fw-blue:#4aacf5]
        dark:[--fw-surface:rgb(27_44_60_/_74%)] dark:[--fw-border:rgb(154_187_212_/_15%)]
        dark:[--fw-soft:#111f2d]
      `}
      ref={homeRef}
      data-motion-paused={motionStopped}
    >
      <HomeAtmosphere motionPaused={motionStopped} />
      <a
        className="fw-skip [&:focus]:top-[16px] fixed left-[16px] top-[-100px] z-[100] p-[12px_20px] text-[white] rounded-[8px] [background:#087bd7]"
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
