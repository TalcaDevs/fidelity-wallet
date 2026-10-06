import {
  cardExpiryDate,
  normalizeDesign,
  normalizeDetails,
  normalizeRegistration,
  type CardDesign,
  type CardDetails,
  type CardType,
  type CardValidity,
  type RegistrationConfig,
} from '@fidelity/shared';
import type { Prisma } from '@prisma/client';

/** Columnas que necesita la vista de la tarjeta: para leerla con select y no traer de más. */
export const cardViewSelect = {
  id: true,
  type: true,
  name: true,
  welcomeBalance: true,
  dailyStampLimit: true,
  stampValidityDays: true,
  cardValidity: true,
  cardExpiresAt: true,
  cardValidityDays: true,
  registration: true,
  design: true,
  details: true,
  designVersion: true,
  stampsEnabled: true,
  pointsEnabled: true,
  allowMultipleRedemptionsPerVisit: true,
} as const satisfies Prisma.LoyaltyProgramSelect;

export type CardProgramRow = Prisma.LoyaltyProgramGetPayload<{ select: typeof cardViewSelect }>;

/** La tarjeta tal como la leen el escáner, el alta y los pases: JSON normalizado y tipado. */
export interface CardView {
  programId: string;
  type: CardType;
  name: string;
  welcomeBalance: number;
  dailyStampLimit: boolean;
  stampValidityDays: number | null;
  validity: CardValidity;
  registration: RegistrationConfig;
  design: CardDesign;
  details: CardDetails;
  designVersion: number;
  stampsEnabled: boolean;
  pointsEnabled: boolean;
  allowMultipleRedemptionsPerVisit: boolean;
}

export function toCardView(program: CardProgramRow): CardView {
  const isDual = program.stampsEnabled && program.pointsEnabled;
  const type: CardType = isDual ? 'DUAL' : (program.type === 'POINTS' ? 'POINTS' : 'STAMPS');

  return {
    programId: program.id,
    type,
    name: program.name,
    welcomeBalance: program.welcomeBalance ?? 0,
    dailyStampLimit: program.dailyStampLimit ?? true,
    stampValidityDays: program.stampValidityDays,
    validity: {
      type: program.cardValidity ?? 'UNLIMITED',
      expiresAt: program.cardExpiresAt ? program.cardExpiresAt.toISOString() : null,
      days: program.cardValidityDays ?? null,
    },
    registration: normalizeRegistration(program.registration),
    design: normalizeDesign(program.design),
    details: normalizeDetails(program.details),
    designVersion: program.designVersion ?? 1,
    stampsEnabled: program.stampsEnabled ?? true,
    pointsEnabled: program.pointsEnabled ?? false,
    allowMultipleRedemptionsPerVisit: program.allowMultipleRedemptionsPerVisit ?? false,
  };
}

/** Vencimiento de la tarjeta de un cliente según la vigencia del programa. */
export function passExpiresAt(card: Pick<CardView, 'validity'>, passCreatedAt: Date): Date | null {
  return cardExpiryDate(card.validity, passCreatedAt);
}
