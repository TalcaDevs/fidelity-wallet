export interface ReportScope {
  brandId: string;
  merchantId: string | null;
}

export function scopeWhere(scope: ReportScope): { merchantId: string } | { brandId: string } {
  return scope.merchantId ? { merchantId: scope.merchantId } : { brandId: scope.brandId };
}
