import type { CardView } from '../../cards/card-program.js';

/** Lo que es de la tarjeta y no de un cliente: la clase de Google Wallet. */
export interface CardClassData {
  programId: string;
  brandName: string;
  card: CardView;
  /** Locales de la marca con coordenadas: Google avisa al pasar cerca (hasta 10). */
  locations: { latitude: number; longitude: number }[];
}

export interface PassData {
  passId: string;
  serialNumber: string;
  passToken: string;
  programId: string;
  merchantName: string;
  customerLabel: string;
  stampsEnabled: boolean;
  pointsEnabled: boolean;
  /** Saldo de sellos vigentes. */
  activeStamps: number;
  /** Saldo de puntos vigentes. */
  activePoints: number;
  targetStamps: number;
  rewardName: string;
  nextExpiryAt?: Date | null;
  memberSince: Date;
  cardExpiresAt: Date | null;
  cardClass: CardClassData;
}
