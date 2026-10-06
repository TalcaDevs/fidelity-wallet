import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cardConfigIssues,
  type CardConfig,
  type CardConfigIssue,
  type CardConfigDto,
  type CardDesign,
  type CardDetails,
} from '@fidelity/shared';
import { errorMessage, useAsyncData } from '../../../hooks/useAsyncData';
import { getCard, saveCard } from '../../../services/cardService';

export function configOf(dto: CardConfigDto): CardConfig {
  return {
    type: dto.type,
    stampsEnabled: dto.stampsEnabled,
    pointsEnabled: dto.pointsEnabled,
    name: dto.name,
    rewards: dto.rewards,
    welcomeBalance: dto.welcomeBalance,
    dailyStampLimit: dto.dailyStampLimit,
    stampValidityDays: dto.stampValidityDays,
    validity: dto.validity,
    registration: dto.registration,
    design: dto.design,
    details: dto.details,
  };
}

/** Estado del editor: la tarjeta guardada, la que se está editando y si hay cambios sin guardar. */
export function useCardEditor(brandId: string) {
  const fetcher = useCallback(() => getCard(brandId), [brandId]);
  const { data: saved, loading, error: loadError, setData: setSaved } = useAsyncData(fetcher);
  const [draft, setDraft] = useState<CardConfig | null>(null);
  const [problems, setProblems] = useState<CardConfigIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const config = draft ?? (saved ? configOf(saved) : null);
  const dirty = useMemo(
    () => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(configOf(saved)),
    [draft, saved],
  );

  // Al recargar o cerrar la pestaña con cambios sin guardar, el navegador pide confirmar.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Siempre sobre el estado previo: una imagen que termina de subir no pisa lo editado mientras tanto.
  const change = useCallback(
    (apply: (base: CardConfig) => CardConfig) => {
      setDraft((prev) => {
        const base = prev ?? (saved ? configOf(saved) : null);
        return base ? apply(base) : prev;
      });
      setProblems([]);
    },
    [saved],
  );

  const update = useCallback((patch: Partial<CardConfig>) => change((base) => ({ ...base, ...patch })), [change]);
  const updateDesign = useCallback(
    (patch: Partial<CardDesign>) => change((base) => ({ ...base, design: { ...base.design, ...patch } })),
    [change],
  );
  const updateDetails = useCallback(
    (patch: Partial<CardDetails>) => change((base) => ({ ...base, details: { ...base.details, ...patch } })),
    [change],
  );

  /** Guarda si pasa las mismas reglas que aplica el backend; si no, devuelve los problemas. */
  const save = useCallback(async (): Promise<boolean> => {
    if (!config || !saved) return false;
    const found = cardConfigIssues(config, { pointsEnabled: saved.points.enabled });
    setProblems(found);
    if (found.length > 0) return false;

    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveCard(brandId, config);
      setSaved(() => result);
      setDraft(null);
      return true;
    } catch (err) {
      setSaveError(errorMessage(err, 'No pudimos guardar la tarjeta'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [brandId, config, saved, setSaved]);

  const discard = useCallback(() => {
    setDraft(null);
    setProblems([]);
  }, []);

  return { saved, config, loading, loadError, dirty, problems, saving, saveError, update, updateDesign, updateDetails, save, discard };
}

export type CardEditor = ReturnType<typeof useCardEditor>;
