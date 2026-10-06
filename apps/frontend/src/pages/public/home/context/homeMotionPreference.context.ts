import { createContext } from "react";
import type { HomeMotionPreference } from "../types/homeMotionPreference.types";
export const HomeMotionPreferenceContext =
  createContext<HomeMotionPreference | null>(null);
