import type { Currency, Prisma } from '@prisma/client';
import { enabledCurrencies, type CardModalities } from '@fidelity/shared';

export { enabledCurrencies, type CardModalities } from '@fidelity/shared';

/** Saldo visible/operativo. Las filas de modalidades ocultas permanecen intactas. */
export async function readCardBalance(
  db: Pick<Prisma.TransactionClient, 'stamp'>,
  passId: string,
  card: CardModalities,
  now: Date,
): Promise<{ activeStamps: number; activePoints: number; nextExpiryAt: Date | null }> {
  const where = { passId, consumedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
  const currencies = enabledCurrencies(card);
  const sum = async (currency: Currency, enabled: boolean) => enabled
    ? (await db.stamp.aggregate({ where: { ...where, currency }, _sum: { amount: true } }))._sum.amount ?? 0
    : 0;
  const [activeStamps, activePoints, nextExpiring] = await Promise.all([
    sum('STAMPS', currencies.includes('STAMPS')),
    sum('POINTS', currencies.includes('POINTS')),
    db.stamp.findFirst({
      where: { passId, consumedAt: null, currency: { in: currencies }, expiresAt: { gt: now } },
      orderBy: { expiresAt: 'asc' },
      select: { expiresAt: true },
    }),
  ]);
  return { activeStamps, activePoints, nextExpiryAt: nextExpiring?.expiresAt ?? null };
}
