import { useCallback } from 'react';
import type { StaffMemberDto } from '@fidelity/shared';
import * as staffService from '../services/staffService';
import { useAsyncData, errorMessage } from './useAsyncData';
import { useToast } from './useToast';

export type { StaffMemberDto };

/** Las acciones devuelven true si salieron bien; el error se informa con un toast. */
export function useTeam(brandId: string | null) {
  const { notifySuccess, notifyError } = useToast();
  const fetcher = useCallback(() => staffService.listStaff(brandId!), [brandId]);
  const { data, loading, error, reload, setData } = useAsyncData(brandId ? fetcher : null);

  const run = useCallback(
    async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
      try {
        await action();
        notifySuccess(success);
        return true;
      } catch (err) {
        notifyError(errorMessage(err));
        return false;
      }
    },
    [notifySuccess, notifyError],
  );

  const removeStaff = useCallback(
    async (userId: string) => {
      if (!brandId) return false;
      const ok = await run(() => staffService.removeStaff(brandId, userId), 'Acceso dado de baja');
      if (ok) setData((prev) => prev?.filter((s) => s.userId !== userId) ?? null);
      return ok;
    },
    [brandId, run, setData],
  );

  const resendInvite = useCallback(
    (userId: string) =>
      brandId
        ? run(() => staffService.resendInvite(brandId, userId), 'Invitación reenviada')
        : Promise.resolve(false),
    [brandId, run],
  );

  const reassignStaff = useCallback(
    async (userId: string, locationId: string) => {
      if (!brandId) return false;
      return run(async () => {
        const updated = await staffService.reassignStaff(brandId, userId, locationId);
        setData((prev) => prev?.map((s) => (s.userId === userId ? updated : s)) ?? null);
      }, 'Local actualizado');
    },
    [brandId, run, setData],
  );

  /** Lanza: el modal de invitación muestra el error junto al formulario. */
  const inviteStaff = useCallback(
    async (input: { email: string; locationId: string; password?: string }) => {
      if (!brandId) return;
      await staffService.inviteStaff(brandId, input);
      notifySuccess(input.password ? 'Usuario creado' : 'Invitación enviada');
      reload();
    },
    [brandId, notifySuccess, reload],
  );

  const getActivity = useCallback(
    (userId: string) => staffService.getStaffActivity(brandId!, userId),
    [brandId],
  );

  return {
    staff: data ?? [],
    loading,
    error,
    removeStaff,
    resendInvite,
    reassignStaff,
    inviteStaff,
    getActivity,
  };
}
