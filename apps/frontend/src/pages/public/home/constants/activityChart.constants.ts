export const SERIES = {
  visits: {
    label: "Visitas",
    unit: "visitas esta semana",
    points: [24, 38, 30, 52, 44, 73, 86],
    next: [34, 43, 55, 46, 65, 80, 92],
    total: 347,
  },
  rewards: {
    label: "Canjes",
    unit: "recompensas entregadas",
    points: [8, 16, 12, 30, 23, 36, 44],
    next: [14, 12, 22, 27, 34, 30, 51],
    total: 38,
  },
} as const;

export const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

export const CHART_UPDATE_INTERVAL_MS = 3400;
export const CHART_VISIBILITY_THRESHOLD = 0.15;
