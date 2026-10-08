import type { Plan } from "@fidelity/shared";

export function capacityOptions(
  plans: readonly Plan[],
  key: "locations" | "teamUsers",
) {
  const limits = [...new Set(plans.map((plan) => plan.limits[key]))].sort(
    (a, b) => a - b,
  );
  let previous = 0;
  return limits.map((limit) => {
    const minimum = previous + 1;
    previous = limit;
    return {
      value: limit,
      label: minimum === limit ? String(limit) : `${minimum} a ${limit}`,
    };
  });
}

export const countLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

export function getPlanBenefits(plan: Plan) {
  return [
    `Hasta ${countLabel(plan.limits.locations, "local", "locales")}`,
    `Hasta ${countLabel(plan.limits.teamUsers, "colaborador", "colaboradores")}`,
    plan.limits.customers === null
      ? "Clientes ilimitados"
      : `Hasta ${plan.limits.customers} clientes`,
    `Hasta ${plan.limits.rewards} recompensas activas`,
    "Tarjetas digitales en Wallet",
    ...(plan.features.pushNotifications
      ? ["Notificaciones push y por ubicación"]
      : []),
    ...(plan.features.advancedMetrics
      ? ["Métricas para conocer a tus clientes"]
      : []),
    ...(plan.features.excelExport ? ["Exportación a Excel"] : []),
  ];
}

export function recommendPlan(
  plans: readonly Plan[],
  locations: number,
  teamUsers: number,
) {
  return [...plans]
    .sort((a, b) => a.priceClpMonthly - b.priceClpMonthly)
    .find(
      (plan) =>
        plan.limits.locations >= locations &&
        plan.limits.teamUsers >= teamUsers,
    );
}
