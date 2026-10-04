import { authenticatedFetch } from '../lib/api';
import { extractApiError } from '../lib/apiError';

// Promoción activa del local y si el saldo del cliente alcanza para canjearla.
export interface PromotionOption {
  id: string;
  name: string;
  rewardName: string;
  targetStamps: number;
  canRedeem: boolean;
}

export interface ScanResult {
  ok: boolean;
  passId?: string;
  scanId?: string;
  customerLabel?: string;
  stampsCount?: number;
  stampsAdded?: number;
  targetStamps?: number;
  rewardUnlocked?: boolean;
  rewardName?: string;
  alreadyScanned?: boolean;
  // Los sellos son un saldo único: el cliente elige en caja cuál de estas canjear.
  availablePromotions?: PromotionOption[];
  // Mensaje del backend; en un sello bloqueado dice cuántos minutos faltan.
  message?: string;
  error?: string;
  errorCode?: string;
}

/** Cliente validado en caja (POST /api/scan/validate): todavía no se sumó nada. */
export interface ScanValidation {
  validationToken: string;
  passId: string;
  method: 'QR' | 'MANUAL';
  /** Primer nombre, o un dato enmascarado si el cliente no dio su nombre. */
  customerLabel: string;
  hasName: boolean;
  stampsCount: number;
  targetStamps: number;
  rewardName: string;
  rewardUnlocked: boolean;
  availablePromotions: PromotionOption[];
  nextStampAvailableAt: string | null;
  canStamp: boolean;
  maxStampsPerLoad: number;
  reasonRequired: boolean;
}

export type ValidationResult =
  | ({ ok: true } & ScanValidation)
  | { ok: false; error: string; errorCode?: string };

interface CustomerApi {
  firstName?: string | null;
  rut?: string | null;
  phone?: string | null;
  email?: string | null;
}

const customerLabelOf = (customer?: CustomerApi) =>
  customer?.firstName ?? customer?.rut ?? customer?.phone ?? customer?.email ?? '';

const MOCK_PROMOTIONS = (stamps: number): PromotionOption[] => [
  { id: 'mock-promo-cafe', name: 'Café', rewardName: 'Café Gratis', targetStamps: 5, canRedeem: stamps >= 5 },
  { id: 'mock-promo-almuerzo', name: 'Almuerzo', rewardName: 'Almuerzo Gratis', targetStamps: 10, canRedeem: stamps >= 10 },
];

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 600));

const mockValidate = (): Promise<ValidationResult> => {
  const stamps = Math.floor(Math.random() * 7);
  return delay({
    ok: true,
    validationToken: 'mock-token',
    passId: 'mock-pass',
    method: 'QR',
    customerLabel: 'María',
    hasName: true,
    stampsCount: stamps,
    targetStamps: 5,
    rewardName: 'Café Gratis',
    rewardUnlocked: stamps >= 5,
    availablePromotions: MOCK_PROMOTIONS(stamps),
    nextStampAvailableAt: null,
    canStamp: true,
    maxStampsPerLoad: 1,
    reasonRequired: false,
  });
};

const mockProcessScan = (action: 'STAMP' | 'REDEEM'): Promise<ScanResult> =>
  delay(
    action === 'REDEEM'
      ? { ok: true, rewardUnlocked: false, customerLabel: 'María', stampsCount: 0, targetStamps: 5 }
      : { ok: true, rewardUnlocked: false, customerLabel: 'María', stampsCount: 3, stampsAdded: 1, targetStamps: 5 },
  );

/** Contrato de POST /api/scan (ScanResultDto del backend), solo con lo que usa la PWA. */
interface ScanApiResponse {
  passId: string;
  scanId?: string;
  activeStamps: number;
  stampsAdded?: number;
  targetStamps: number;
  rewardUnlocked: boolean;
  rewardName: string;
  alreadyScanned: boolean;
  availablePromotions?: PromotionOption[];
  message?: string;
  customer?: CustomerApi;
}

/** Contrato de POST /api/scan/validate (ScanValidationDto del backend). */
interface ValidationApiResponse {
  validationToken: string;
  passId: string;
  method: 'QR' | 'MANUAL';
  customer: CustomerApi;
  activeStamps: number;
  targetStamps: number;
  rewardName: string;
  rewardUnlocked: boolean;
  availablePromotions: PromotionOption[];
  nextStampAvailableAt: string | null;
  canStamp: boolean;
  maxStampsPerLoad: number;
  reasonRequired: boolean;
}

/** A quién se busca: el QR del pase o, en el ingreso manual, el RUT, teléfono o correo. */
export type LookupTarget =
  | { passToken: string }
  | { customer: { rut: string } | { phone: string } | { email: string } };

/** A quién se le suma o canjea: el comprobante de la validación (o, sin él, el QR o el dato). */
export type ScanTarget = LookupTarget | { validationToken: string };

/** Datos opcionales de la compra al sumar el sello. */
export interface StampExtras {
  purchaseAmount?: number;
  note?: string;
  receipt?: File;
  /** Solo el dueño: más de un sello, o sumar dentro del bloqueo, exige motivo. */
  stampCount?: number;
  reason?: string;
}

export interface ScanParams {
  merchantId: string;
  action: 'STAMP' | 'REDEEM';
  target: ScanTarget;
  // Solo en REDEEM: la promoción que eligió el cliente.
  promotionId?: string;
  extras?: StampExtras;
}

async function failure(response: Response): Promise<{ ok: false; error: string; errorCode?: string }> {
  const errorData: unknown = await response.json().catch(() => null);
  if (response.status === 401) {
    return { ok: false, error: 'Tu sesión venció. Vuelve a iniciar sesión.', errorCode: 'UNAUTHORIZED' };
  }
  if ([400, 403, 404, 409, 413, 429].includes(response.status)) {
    return { ok: false, error: extractApiError(errorData) ?? 'Pase inválido o de otro local' };
  }
  return { ok: false, error: 'Ocurrió un error al procesar el pase' };
}

export const validateScan = async (params: { merchantId: string; target: LookupTarget }): Promise<ValidationResult> => {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return mockValidate();
  }

  try {
    const response = await authenticatedFetch('/api/scan/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId: params.merchantId, ...params.target }),
    });
    if (!response.ok) return failure(response);

    const data = (await response.json()) as ValidationApiResponse;
    return {
      ok: true,
      validationToken: data.validationToken,
      passId: data.passId,
      method: data.method,
      customerLabel: customerLabelOf(data.customer),
      hasName: Boolean(data.customer.firstName),
      stampsCount: data.activeStamps,
      targetStamps: data.targetStamps,
      rewardName: data.rewardName,
      rewardUnlocked: data.rewardUnlocked,
      availablePromotions: data.availablePromotions ?? [],
      nextStampAvailableAt: data.nextStampAvailableAt,
      canStamp: data.canStamp,
      maxStampsPerLoad: data.maxStampsPerLoad,
      reasonRequired: data.reasonRequired,
    };
  } catch {
    return { ok: false, error: 'Error de red o de servidor' };
  }
};

/** Con foto va en multipart/form-data; sin ella, JSON como siempre. */
function scanRequestBody(params: ScanParams): RequestInit {
  const { extras, ...rest } = params;
  const fields: Record<string, unknown> = {
    merchantId: rest.merchantId,
    action: rest.action,
    ...rest.target,
    ...(rest.promotionId ? { promotionId: rest.promotionId } : {}),
    ...(extras?.purchaseAmount !== undefined ? { purchaseAmount: extras.purchaseAmount } : {}),
    ...(extras?.note ? { note: extras.note } : {}),
    ...(extras?.stampCount !== undefined ? { stampCount: extras.stampCount } : {}),
    ...(extras?.reason ? { reason: extras.reason } : {}),
  };

  if (!extras?.receipt) {
    return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) };
  }

  // Sin Content-Type: el navegador lo pone con el boundary del multipart.
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'object' && value !== null) {
      for (const [inner, innerValue] of Object.entries(value)) form.append(`${key}[${inner}]`, String(innerValue));
    } else {
      form.append(key, String(value));
    }
  }
  form.append('receipt', extras.receipt);
  return { body: form };
}

export const processScan = async (params: ScanParams): Promise<ScanResult> => {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return mockProcessScan(params.action);
  }

  try {
    const response = await authenticatedFetch('/api/scan', { method: 'POST', ...scanRequestBody(params) });
    if (!response.ok) return failure(response);

    const data = (await response.json()) as ScanApiResponse;
    return {
      ok: true,
      passId: data.passId,
      scanId: data.scanId,
      customerLabel: customerLabelOf(data.customer),
      stampsCount: data.activeStamps,
      stampsAdded: data.stampsAdded,
      targetStamps: data.targetStamps,
      rewardUnlocked: data.rewardUnlocked,
      rewardName: data.rewardName,
      alreadyScanned: data.alreadyScanned,
      availablePromotions: data.availablePromotions ?? [],
      message: data.message
    };
  } catch {
    return { ok: false, error: 'Error de red o de servidor' };
  }
};
