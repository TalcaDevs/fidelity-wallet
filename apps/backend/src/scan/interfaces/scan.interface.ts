import type { Customer, LoyaltyProgram, Pass, Promotion, Scan, ScanMethod } from '@prisma/client';
import type { CardView } from '../../cards/card-program.js';
import type { Db, LocationWithBrand } from '../../common/access/brand-access.js';
import type { ValidatedImage } from '../../common/storage/image.js';
import type { MaskedCustomerDto } from '../dto/scan-action.dto.js';

export type PassWithRelations = Pass & {
  customer: Customer | null;
};

/** La tarjeta de la marca y lo que vale cada punto. */
export interface BrandCard {
  program: LoyaltyProgram;
  card: CardView;
  pesosPerPoint: number;
}

export interface ScanContext extends BrandCard {
  merchant: LocationWithBrand;
}

export type StampSource = 'SCANNER' | 'PANEL';

export interface ResolvedTarget {
  pass: PassWithRelations;
  method: ScanMethod;
}

/** Lo que puede acompañar una carga de sellos, venga del escáner o del panel. */
export interface StampInput {
  stampCount?: number;
  currency?: 'STAMPS' | 'POINTS';
  reason?: string;
  purchaseAmount?: number;
  note?: string;
}

export interface StampOptions {
  stampCount: number;
  pointsEarned: number;
  source: StampSource;
  isOwner: boolean;
  reason?: string;
  purchaseAmount?: number;
  note?: string;
  receipt: { path: string; image: ValidatedImage } | null;
}

export interface StampResponseContext {
  passId: string;
  card: CardView;
  promotions: Promotion[];
  customer: MaskedCustomerDto | undefined;
  options: StampOptions;
  scan: Pick<Scan, 'id' | 'method'>;
  now: Date;
  block?: { until: Date; scan: Scan; cause: 'STAMP' | 'POINTS' };
}

export type Tx = Db;
