import type { SubscriptionMock } from '@fidelity/shared';
import { requestJson } from './httpJson';

// Suscripción simulada con uso real (HANDOFF §6.5).
export function getSubscription(brandId: string): Promise<SubscriptionMock> {
  return requestJson(
    `/api/brands/${brandId}/billing/subscription`,
    undefined,
    'No se pudo cargar tu suscripción',
  );
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function trialDaysLeft(subscription: SubscriptionMock, now: Date): number {
  if (subscription.status !== 'TRIALING' || !subscription.trialEndsAt) return 0;
  const ms = new Date(subscription.trialEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / MS_PER_DAY));
}
