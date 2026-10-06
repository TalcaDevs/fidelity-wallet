import { useContext } from 'react';
import { useReducedMotion } from 'motion/react';
import { PanelMotionContext } from '../components/admin/PanelMotionContext';

export function usePanelMotion() {
  const panelPreference = useContext(PanelMotionContext);
  const systemPreference = useReducedMotion();
  return panelPreference ?? Boolean(systemPreference);
}
