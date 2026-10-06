import type { StampProps } from "./loyaltyCardVisuals.types.ts";
import type { RefObject, SVGProps, ReactNode } from "react";
import type { HomeIconName } from "./homeIcon.types.ts";
import type { DemoState } from "./loyaltyCardControls.types.ts";
import type { Plan } from "@fidelity/shared";
export type ActivityChartProps = {
  motionPaused?: boolean;
};

export type ExperienceSectionProps = {
  motionStopped: boolean;
};

export type HeroSectionProps = {
  introReady: boolean;
  replayKey: number;
  motionStopped: boolean;
  onCardReady: () => void;
  replay: () => void;
};

export type HomeAtmosphereProps = { motionPaused: boolean };

export type HomeBrandProps = {
  label?: string;
};

export type HomeHeaderProps = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean | ((value: boolean) => boolean)) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  menuToggleRef: RefObject<HTMLButtonElement | null>;
};

export type HomeIconProps = SVGProps<SVGSVGElement> & { name: HomeIconName };

export type LocationsStoryProps = {
  motionPaused?: boolean;
};

export type LoyaltyCardControlsProps = { demo: DemoState };

export type StampFaceProps = { index: number; filled: boolean };

export type LoyaltyStampProps = StampProps & { index: number };

export type MotionControlProps = {
  motionPaused: boolean;
  reducedMotion: boolean;
  onToggle: () => void;
};

export type PlanCardProps = {
  plan: Plan;
  annual: boolean;
  recommended: boolean;
};

export type PricingSectionProps = {
  motionPaused?: boolean;
};

export type HomeMotionProviderProps = { children: ReactNode };
