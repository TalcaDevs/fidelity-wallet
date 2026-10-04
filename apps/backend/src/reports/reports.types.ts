export interface ReportScope {
  brandId: string;
  merchantId: string | null;
}

export function scopeWhere(scope: ReportScope): { merchantId: string } | { brandId: string } {
  return scope.merchantId ? { merchantId: scope.merchantId } : { brandId: scope.brandId };
}

/** Movimientos que cuentan como visita: el saldo de bienvenida lo da el sistema, no una visita. */
export const VISIT_SCANS = { method: { not: 'WELCOME' as const } };
