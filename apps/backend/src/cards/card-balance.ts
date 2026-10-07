import type { Currency, Prisma } from '@prisma/client';

export interface CardModalities {
  stampsEnabled: boolean;
  pointsEnabled: boolean;
}

export function enabledCurrencies(card: CardModalities): Currency[] {
  return [
    ...(card.stampsEnabled ? ['STAMPS' as const] : []),
    ...(card.pointsEnabled ? ['POINTS' as const] : []),
  ];
}

/** Saldo visible/operativo. Las filas de modalidades ocultas permanecen intactas. */
export async function readCardBalance(
  db: Pick<Prisma.TransactionClient, 'stamp'>,
  passId: string,
  card: CardModalities,
  now: Date,
): Promise<{ activeStamps: number; activePoints: number; nextExpiryAt: Date | null }> {
  const where = { passId, consumedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
  const sum = async (currency: Currency, enabled: boolean) => enabled
    ? (await db.stamp.aggregate({ where: { ...where, currency }, _sum: { amount: true } }))._sum.amount ?? 0
    : 0;
  const [activeStamps, activePoints, nextExpiring] = await Promise.all([
    sum('STAMPS', card.stampsEnabled),
    sum('POINTS', card.pointsEnabled),
    db.stamp.findFirst({
      where: { passId, consumedAt: null, currency: { in: enabledCurrencies(card) }, expiresAt: { gt: now } },
      orderBy: { expiresAt: 'asc' },
      select: { expiresAt: true },
    }),
  ]);
  return { activeStamps, activePoints, nextExpiryAt: nextExpiring?.expiresAt ?? null };
}
