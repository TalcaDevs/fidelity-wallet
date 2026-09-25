import { supabase } from '../lib/supabase';
import { apiUrl } from '../lib/api';
import { extractApiError } from '../lib/apiError';

export interface CustomerRow {
  passId: string;
  customerId: string;
  rut: string | null;
  phone: string | null;
  // Saldo vigente: sellos ni consumidos ni vencidos. Reemplaza al viejo
  // contador plano Pass.stampsCount, que no sabía de vencimientos.
  activeStamps: number;
  nextExpiryAt: string | null;
  joinedAt: string;
  lastActivityAt: string;
}

interface RawPassRow {
  id: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id?: string; rut: string | null; phone: string | null } | { id?: string; rut: string | null; phone: string | null }[] | null;
}

interface RawBalanceRow {
  passId: string;
  activeStamps: number;
  nextExpiryAt: string | null;
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// Dos consultas en vez de un embed: PassStampBalance es una vista y PostgREST no
// garantiza detectarle la relación con Pass, así que cruzamos por passId acá.
export async function listCustomers(merchantId: string): Promise<CustomerRow[]> {
  const [passesRes, balancesRes] = await Promise.all([
    // Pass.updatedAt cambia con cada sello, así que sirve como última actividad
    // sin tener que traer la tabla Scan completa.
    supabase
      .from('Pass')
      .select('id, customerId, createdAt, updatedAt, customer:Customer(id, rut, phone)')
      .eq('merchantId', merchantId)
      .order('updatedAt', { ascending: false }),
    supabase
      .from('PassStampBalance')
      .select('passId, activeStamps, nextExpiryAt')
      .eq('merchantId', merchantId),
  ]);

  // supabase-js no lanza: devuelve { data, error }. Sin esto, un fallo del saldo
  // dejaría la tabla en cero y el dueño creería que sus clientes no tienen sellos.
  const failed = [passesRes, balancesRes].find((res) => res.error);
  if (failed?.error) throw failed.error;

  const balances = new Map(
    ((balancesRes.data ?? []) as RawBalanceRow[]).map((row) => [row.passId, row]),
  );

  return ((passesRes.data ?? []) as RawPassRow[]).map((row) => {
    const customer = firstOrSelf(row.customer);
    const balance = balances.get(row.id);
    return {
      passId: row.id,
      customerId: row.customerId ?? customer?.id ?? '',
      rut: customer?.rut ?? null,
      phone: customer?.phone ?? null,
      // Un pase sin sellos vigentes puede no tener fila en la vista.
      activeStamps: balance?.activeStamps ?? 0,
      nextExpiryAt: balance?.nextExpiryAt ?? null,
      joinedAt: row.createdAt,
      lastActivityAt: row.updatedAt,
    };
  });
}

export interface RequestRecoveryParams {
  merchantId: string;
  rut: string;
  phone: string;
}

export interface RequestRecoveryResult {
  success: boolean;
  message: string;
  phoneMasked: string;
  devCode?: string;
  error?: string;
}

export interface VerifyRecoveryParams {
  merchantId: string;
  rut: string;
  phone: string;
  code: string;
}

export interface VerifyRecoveryResult {
  success: boolean;
  customerId?: string;
  passId?: string;
  appleWalletUrl?: string;
  googleWalletUrl?: string;
  message?: string;
  error?: string;
}

export async function requestPassRecovery(params: RequestRecoveryParams): Promise<RequestRecoveryResult> {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return {
      success: true,
      message: 'Código de prueba enviado a tu teléfono',
      phoneMasked: '+56 9 **** 5678',
      devCode: '123456',
    };
  }

  try {
    const res = await fetch(apiUrl('/api/customers/recovery/request'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        message: '',
        phoneMasked: '',
        error: extractApiError(data) ?? 'Error al solicitar el código de recuperación',
      };
    }

    return data as RequestRecoveryResult;
  } catch {
    return {
      success: false,
      message: '',
      phoneMasked: '',
      error: 'Error de conexión. Intenta de nuevo.',
    };
  }
}

export async function verifyPassRecovery(params: VerifyRecoveryParams): Promise<VerifyRecoveryResult> {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return {
      success: true,
      customerId: 'mock-c-1',
      passId: 'mock-p-1',
      appleWalletUrl: '#',
      googleWalletUrl: '#',
      message: '¡Tarjeta recuperada con éxito!',
    };
  }

  try {
    const res = await fetch(apiUrl('/api/customers/recovery/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        error: extractApiError(data) ?? 'Código de verificación incorrecto o expirado',
      };
    }

    return data as VerifyRecoveryResult;
  } catch {
    return {
      success: false,
      error: 'Error de conexión. Intenta de nuevo.',
    };
  }
}

/**
 * Elimina los datos y pase de un cliente en cumplimiento de la Ley 19.628 (cancelación de datos).
 * Requiere que el usuario autenticado sea el dueño (OWNER) del comercio.
 */
export async function deleteCustomer(merchantId: string, customerId: string): Promise<void> {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No hay sesión activa para realizar esta acción.');
  }

  const url = apiUrl(
    `/api/customers/${encodeURIComponent(customerId)}?merchantId=${encodeURIComponent(merchantId)}`,
  );
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null);
    throw new Error(extractApiError(errorData) ?? 'Error al eliminar los datos del cliente.');
  }
}

export interface RequestDeletionParams {
  merchantId: string;
  rut?: string;
  phone?: string;
}

export interface RequestDeletionResult {
  success: boolean;
  message?: string;
  maskedPhone?: string;
  error?: string;
}

export async function requestCustomerDeletion(
  params: RequestDeletionParams,
): Promise<RequestDeletionResult> {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return {
      success: true,
      maskedPhone: '···5678',
      message: 'Código de confirmación enviado por SMS (Mock)',
    };
  }

  try {
    const response = await fetch(apiUrl('/api/customers/deletion/request'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        success: false,
        error: extractApiError(data) ?? 'No se pudo enviar el código de confirmación.',
      };
    }

    return data as RequestDeletionResult;
  } catch {
    return {
      success: false,
      error: 'Error de conexión. Intenta de nuevo.',
    };
  }
}

export interface VerifyDeletionParams {
  merchantId: string;
  rut?: string;
  phone?: string;
  code: string;
}

export interface VerifyDeletionResult {
  success: boolean;
  message?: string;
  customerCompletelyDeleted?: boolean;
  error?: string;
}

export async function verifyCustomerDeletion(
  params: VerifyDeletionParams,
): Promise<VerifyDeletionResult> {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return {
      success: true,
      message: 'Tus datos personales y tu tarjeta han sido eliminados de acuerdo con la Ley 19.628.',
      customerCompletelyDeleted: true,
    };
  }

  try {
    const response = await fetch(apiUrl('/api/customers/deletion/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        success: false,
        error: extractApiError(data) ?? 'Código de verificación incorrecto o expirado.',
      };
    }

    return data as VerifyDeletionResult;
  } catch {
    return {
      success: false,
      error: 'Error de conexión. Intenta de nuevo.',
    };
  }
}
