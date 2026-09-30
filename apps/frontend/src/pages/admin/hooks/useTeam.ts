import { useState, useCallback } from 'react';
import { authenticatedFetch } from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';

export interface StaffMember {
  userId: string;
  email: string;
  role: string;
  locationId: string;
  locationName: string;
  status: 'INVITED' | 'ACTIVE';
  lastSignInAt: string | null;
  invitedAt: string;
}

export interface ScanActivity {
  id: string;
  type: 'STAMP_ADDED' | 'REWARD_REDEEMED';
  method: 'QR' | 'MANUAL';
  createdAt: string;
  customerPhone: string;
  promotionName: string | null;
}

export function useTeam(merchantId: string | null) {
  const { notifySuccess, notifyError } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStaff = useCallback(async () => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/brands/${merchantId}/staff`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      } else {
        throw new Error('Error al cargar personal');
      }
    } catch (err: any) {
      notifyError(err.message || 'Error cargando personal');
    } finally {
      setLoading(false);
    }
  }, [merchantId, notifyError]);

  const removeStaff = useCallback(async (userId: string) => {
    if (!merchantId) return false;
    try {
      const res = await authenticatedFetch(`/brands/${merchantId}/staff/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStaff(prev => prev.filter(s => s.userId !== userId));
        notifySuccess('Personal eliminado exitosamente');
        return true;
      }
      const err = await res.json();
      throw new Error(err.message || 'Error al eliminar');
    } catch (err: any) {
      notifyError(err.message || 'Error eliminando personal');
      return false;
    }
  }, [merchantId, notifySuccess, notifyError]);

  const inviteStaff = useCallback(async (email: string, password?: string) => {
    if (!merchantId) return false;
    try {
      const res = await authenticatedFetch(`/brands/${merchantId}/staff/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password || undefined })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al invitar personal');
      }
      notifySuccess('Usuario agregado exitosamente');
      await loadStaff();
      return true;
    } catch (err: any) {
      throw err; // El modal maneja el error internamente
    }
  }, [merchantId, loadStaff, notifySuccess]);

  const getActivity = useCallback(async (userId: string) => {
    if (!merchantId) return [];
    try {
      const res = await authenticatedFetch(`/brands/${merchantId}/staff/${userId}/scans`);
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (err) {
      return [];
    }
  }, [merchantId]);

  return { staff, loading, loadStaff, removeStaff, inviteStaff, getActivity };
}
