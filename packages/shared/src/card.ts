// Contrato de la tarjeta de la marca (editor /admin/card, pase de Google Wallet, landing /join).
// Una tarjeta por marca: sellos por visita o puntos por dinero gastado.

export type CardType = 'STAMPS' | 'POINTS' | 'DUAL';
export const CARD_TYPES: readonly CardType[] = ['STAMPS', 'POINTS', 'DUAL'];

export const DEFAULT_PESOS_PER_POINT = 1000;
export const PESOS_PER_POINT_MIN = 1;
export const PESOS_PER_POINT_MAX = 1_000_000;

export const CARD_NAME_MIN = 2;
export const CARD_NAME_MAX = 40;
export const REWARD_NAME_MAX = 60;
export const CARD_REWARDS_MAX = 5;
/** Más de 30 sellos no caben legibles en la tira del pase. */
export const STAMPS_TARGET_MAX = 30;
export const POINTS_TARGET_MAX = 1_000_000;
export const WELCOME_STAMPS_MAX = 10;
export const WELCOME_POINTS_MAX = 100_000;
export const STAMP_VALIDITY_DAYS_MAX = 3650;
export const CARD_VALIDITY_DAYS_MAX = 3650;
export const CARD_LINKS_MAX = 10;
export const CARD_SECTIONS_MAX = 10;
export const CARD_LINK_LABEL_MAX = 40;
export const CARD_LINK_VALUE_MAX = 300;
export const CARD_SECTION_HEADER_MAX = 40;
export const CARD_SECTION_BODY_MAX = 1000;
export const CARD_FRONT_FIELDS_MAX = 2;

export const CARD_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CARD_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export type CardImageKind = 'logo' | 'wideLogo' | 'hero' | 'stampEmpty' | 'stampFilled';
export const CARD_IMAGE_KINDS: readonly CardImageKind[] = [
  'logo',
  'wideLogo',
  'hero',
  'stampEmpty',
  'stampFilled',
];

/** Tamaño final de cada imagen: lo que recomienda Google Wallet para cada espacio. */
export const CARD_IMAGE_SPECS: Record<
  CardImageKind,
  { width: number; height: number; fit: 'cover' | 'contain'; format: 'png' | 'jpg' }
> = {
  logo: { width: 660, height: 660, fit: 'cover', format: 'png' },
  wideLogo: { width: 1280, height: 400, fit: 'contain', format: 'png' },
  hero: { width: 1032, height: 336, fit: 'cover', format: 'jpg' },
  stampEmpty: { width: 256, height: 256, fit: 'contain', format: 'png' },
  stampFilled: { width: 256, height: 256, fit: 'contain', format: 'png' },
};

export type FieldMode = 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';
export const FIELD_MODES: readonly FieldMode[] = ['REQUIRED', 'OPTIONAL', 'HIDDEN'];
export type RegistrationField = 'phone' | 'email' | 'name' | 'birthday' | 'rut';
export const REGISTRATION_FIELDS: readonly RegistrationField[] = [
  'phone',
  'email',
  'name',
  'birthday',
  'rut',
];
export type RegistrationConfig = Record<RegistrationField, FieldMode>;

export const DEFAULT_REGISTRATION: RegistrationConfig = {
  phone: 'OPTIONAL',
  email: 'OPTIONAL',
  name: 'OPTIONAL',
  birthday: 'OPTIONAL',
  rut: 'OPTIONAL',
};

export type CardValidityType = 'UNLIMITED' | 'FIXED_DATE' | 'AFTER_JOIN';
export const CARD_VALIDITY_TYPES: readonly CardValidityType[] = [
  'UNLIMITED',
  'FIXED_DATE',
  'AFTER_JOIN',
];

export interface CardValidity {
  type: CardValidityType;
  /** Solo FIXED_DATE: ISO. Todas las tarjetas vencen ese día. */
  expiresAt: string | null;
  /** Solo AFTER_JOIN: días desde que el cliente obtuvo la tarjeta. */
  days: number | null;
}

export type StampIcon =
  | 'STAR'
  | 'DIAMOND'
  | 'CIRCLE'
  | 'HEART'
  | 'TRIANGLE'
  | 'SPARKLE'
  | 'COFFEE'
  | 'CHECK';

/** Trazados en una caja de 24x24. */
export const STAMP_ICON_PATHS: Record<StampIcon, string> = {
  STAR: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  DIAMOND: 'M12 2l8 10-8 10-8-10z',
  CIRCLE: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z',
  HEART:
    'M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21z',
  TRIANGLE: 'M12 3l10 18H2z',
  SPARKLE: 'M12 2c.6 4.6 2.4 7.4 10 10-7.6 2.6-9.4 5.4-10 10-.6-4.6-2.4-7.4-10-10 7.6-2.6 9.4-5.4 10-10z',
  COFFEE:
    'M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V8zm13 1h1.5a2.5 2.5 0 0 1 0 5H17v-2h1.5a.5.5 0 0 0 0-1H17V9zM7 2h2v4H7zm4 0h2v4h-2z',
  CHECK: 'M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z',
};
export const STAMP_ICONS = Object.keys(STAMP_ICON_PATHS) as StampIcon[];

export interface CardDesign {
  backgroundColor: string;
  /** Solo Apple Wallet: Google elige el color del texto según el fondo. */
  textColor: string;
  labelColor: string;
  /** Fondo del sello ya puesto. */
  stampFilledColor: string;
  /** Ícono del sello ya puesto. */
  stampIconColor: string;
  /** Contorno e ícono del sello vacío. */
  stampEmptyColor: string;
  stampIcon: StampIcon;
  logoUrl: string | null;
  wideLogoUrl: string | null;
  heroImageUrl: string | null;
  stampEmptyImageUrl: string | null;
  stampFilledImageUrl: string | null;
}

export type CardDesignImageField =
  | 'logoUrl'
  | 'wideLogoUrl'
  | 'heroImageUrl'
  | 'stampEmptyImageUrl'
  | 'stampFilledImageUrl';

export const IMAGE_FIELD_OF: Record<CardImageKind, CardDesignImageField> = {
  logo: 'logoUrl',
  wideLogo: 'wideLogoUrl',
  hero: 'heroImageUrl',
  stampEmpty: 'stampEmptyImageUrl',
  stampFilled: 'stampFilledImageUrl',
};

export interface CardTheme {
  id: string;
  name: string;
  design: Pick<
    CardDesign,
    | 'backgroundColor'
    | 'textColor'
    | 'labelColor'
    | 'stampFilledColor'
    | 'stampIconColor'
    | 'stampEmptyColor'
  >;
}

export const CARD_THEMES: readonly CardTheme[] = [
  {
    id: 'manglar',
    name: 'Manglar',
    design: {
      backgroundColor: '#A3472F',
      textColor: '#FFFFFF',
      labelColor: '#F6D9CF',
      stampFilledColor: '#FFFFFF',
      stampIconColor: '#A3472F',
      stampEmptyColor: '#F6D9CF',
    },
  },
  {
    id: 'oceano',
    name: 'Océano',
    design: {
      backgroundColor: '#2D5D6B',
      textColor: '#FFFFFF',
      labelColor: '#CFE3E8',
      stampFilledColor: '#F2C14E',
      stampIconColor: '#2D5D6B',
      stampEmptyColor: '#CFE3E8',
    },
  },
  {
    id: 'selva',
    name: 'Selva',
    design: {
      backgroundColor: '#2F5E3A',
      textColor: '#FFFFFF',
      labelColor: '#D5E8D9',
      stampFilledColor: '#F2C14E',
      stampIconColor: '#2F5E3A',
      stampEmptyColor: '#D5E8D9',
    },
  },
  {
    id: 'medianoche',
    name: 'Medianoche',
    design: {
      backgroundColor: '#1F1B1A',
      textColor: '#FFFFFF',
      labelColor: '#BDB3AD',
      stampFilledColor: '#E2B33C',
      stampIconColor: '#1F1B1A',
      stampEmptyColor: '#8A817C',
    },
  },
  {
    id: 'arena',
    name: 'Arena',
    design: {
      backgroundColor: '#EADFCB',
      textColor: '#3B2A20',
      labelColor: '#7A6150',
      stampFilledColor: '#A3472F',
      stampIconColor: '#FFFFFF',
      stampEmptyColor: '#A08670',
    },
  },
  {
    id: 'clasico',
    name: 'Clásico',
    design: {
      backgroundColor: '#1E3A8A',
      textColor: '#FFFFFF',
      labelColor: '#BFDBFE',
      stampFilledColor: '#FFFFFF',
      stampIconColor: '#1E3A8A',
      stampEmptyColor: '#BFDBFE',
    },
  },
];

export const BACKGROUND_SWATCHES = [
  '#A3472F',
  '#C4683F',
  '#8E3B2E',
  '#A8622E',
  '#2D5D6B',
  '#2F5E3A',
  '#7A4B66',
  '#1F1B1A',
  '#1E3A8A',
] as const;

export const STAMP_SWATCHES = [
  '#FFF8F0',
  '#FFFFFF',
  '#C9A24A',
  '#F2C14E',
  '#E8875A',
  '#1F1B1A',
] as const;

export const DEFAULT_CARD_DESIGN: CardDesign = {
  ...CARD_THEMES[0].design,
  stampIcon: 'STAR',
  logoUrl: null,
  wideLogoUrl: null,
  heroImageUrl: null,
  stampEmptyImageUrl: null,
  stampFilledImageUrl: null,
};

/** Datos que el dueño elige mostrar en el pase. CUSTOMER_NAME va aparte: es el "titular". */
export type CardFieldKey = 'REWARD' | 'PROGRESS' | 'STAMPS_EXPIRY' | 'CARD_EXPIRY' | 'MEMBER_SINCE';
export const CARD_FIELD_KEYS: readonly CardFieldKey[] = [
  'REWARD',
  'PROGRESS',
  'STAMPS_EXPIRY',
  'CARD_EXPIRY',
  'MEMBER_SINCE',
];

export type CardLinkType = 'WEBSITE' | 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'INSTAGRAM';
export const CARD_LINK_TYPES: readonly CardLinkType[] = [
  'WEBSITE',
  'PHONE',
  'EMAIL',
  'WHATSAPP',
  'INSTAGRAM',
];

export interface CardLink {
  type: CardLinkType;
  label: string;
  value: string;
}

export interface CardSection {
  header: string;
  body: string;
}

export interface CardDetails {
  links: CardLink[];
  sections: CardSection[];
  /** Datos visibles en el detalle del pase. */
  fields: CardFieldKey[];
  /** Los que además van en el frente, junto al saldo. Subconjunto de fields. */
  frontFields: CardFieldKey[];
  showCustomerName: boolean;
  /** Google avisa al cliente cuando pasa cerca de un local (hasta 10 locales). */
  nearbyNotifications: boolean;
  /** Botón "sitio web" en el frente del pase de Google. */
  homepageUrl: string | null;
}

export const DEFAULT_CARD_DETAILS: CardDetails = {
  links: [],
  sections: [],
  fields: ['REWARD', 'PROGRESS', 'STAMPS_EXPIRY'],
  frontFields: ['REWARD'],
  showCustomerName: true,
  nearbyNotifications: false,
  homepageUrl: null,
};

export interface CardReward {
  /** Ausente en una recompensa nueva. */
  id?: string;
  name: string;
  /** Sellos o puntos que cuesta. */
  target: number;
  /** Moneda de la recompensa. */
  currency?: 'STAMPS' | 'POINTS';
}

/** Lo que edita el dueño en el editor y se guarda de una vez. */
export interface CardConfig {
  type: CardType;
  stampsEnabled: boolean;
  pointsEnabled: boolean;
  name: string;
  rewards: CardReward[];
  welcomeBalance: number;
  /** Solo sellos: el STAFF suma a lo más uno por día y cliente; el dueño puede sumar más. */
  dailyStampLimit: boolean;
  /** Vigencia de cada sello o punto en días; null = no vencen. */
  stampValidityDays: number | null;
  validity: CardValidity;
  registration: RegistrationConfig;
  design: CardDesign;
  details: CardDetails;
}

export interface CardPointsSettings {
  enabled: boolean;
  pesosPerPoint: number;
}

/** GET /api/brands/:brandId/card */
export interface CardConfigDto extends CardConfig {
  programId: string;
  brandName: string;
  designVersion: number;
  updatedAt: string;
  points: CardPointsSettings;
  /** Hay clientes con saldo vigente: cambiar de sellos a puntos (o al revés) se los borraría. */
  typeLocked: boolean;
  customers: number;
  locations: number;
}

/** Lo que la landing /join necesita de la tarjeta. */
export interface PublicCardDto {
  type: CardType;
  name: string;
  backgroundColor: string;
  textColor: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  pesosPerPoint: number;
  welcomeBalance: number;
  registration: RegistrationConfig;
  /** La tarjeta de término fijo ya venció: no se aceptan altas. */
  closed: boolean;
}

export interface CardImageUploadDto {
  url: string;
}

const HEX = /^#[0-9A-F]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

export function balanceUnit(type: CardType, count = 2): string {
  if (type === 'POINTS') return count === 1 ? 'punto' : 'puntos';
  return count === 1 ? 'sello' : 'sellos';
}

export function pointsForAmount(amount: number, pesosPerPoint: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || pesosPerPoint <= 0) return 0;
  return Math.floor(amount / pesosPerPoint);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dos colores #RRGGBB (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Google no deja elegir el color del texto: usa blanco o negro según el fondo. */
export function autoTextColor(background: string): '#FFFFFF' | '#000000' {
  return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#000000')
    ? '#FFFFFF'
    : '#000000';
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const color = (value: unknown, fallback: string) =>
  isHexColor(value) ? value.toUpperCase() : fallback;

const optionalUrl = (value: unknown) =>
  typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;

const record = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

/** Lo que viene de la BD (JSON) completado con los valores por defecto. No valida reglas. */
export function normalizeDesign(raw: unknown): CardDesign {
  const r = record(raw);
  const d = DEFAULT_CARD_DESIGN;
  return {
    backgroundColor: color(r.backgroundColor, d.backgroundColor),
    textColor: color(r.textColor, d.textColor),
    labelColor: color(r.labelColor, d.labelColor),
    stampFilledColor: color(r.stampFilledColor, d.stampFilledColor),
    stampIconColor: color(r.stampIconColor, d.stampIconColor),
    stampEmptyColor: color(r.stampEmptyColor, d.stampEmptyColor),
    stampIcon: pick(r.stampIcon, STAMP_ICONS, d.stampIcon),
    logoUrl: optionalUrl(r.logoUrl),
    wideLogoUrl: optionalUrl(r.wideLogoUrl),
    heroImageUrl: optionalUrl(r.heroImageUrl),
    stampEmptyImageUrl: optionalUrl(r.stampEmptyImageUrl),
    stampFilledImageUrl: optionalUrl(r.stampFilledImageUrl),
  };
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export function normalizeDetails(raw: unknown): CardDetails {
  const r = record(raw);
  const d = DEFAULT_CARD_DETAILS;
  const keys = (value: unknown, fallback: CardFieldKey[]) =>
    Array.isArray(value)
      ? [...new Set(value.filter((k): k is CardFieldKey => CARD_FIELD_KEYS.includes(k as CardFieldKey)))]
      : fallback;
  const fields = keys(r.fields, d.fields);
  return {
    links: Array.isArray(r.links)
      ? r.links.slice(0, CARD_LINKS_MAX).map((l) => {
          const link = record(l);
          return {
            type: pick(link.type, CARD_LINK_TYPES, 'WEBSITE'),
            label: text(link.label, CARD_LINK_LABEL_MAX),
            value: text(link.value, CARD_LINK_VALUE_MAX),
          };
        })
      : [],
    sections: Array.isArray(r.sections)
      ? r.sections.slice(0, CARD_SECTIONS_MAX).map((s) => {
          const section = record(s);
          return {
            header: text(section.header, CARD_SECTION_HEADER_MAX),
            body: text(section.body, CARD_SECTION_BODY_MAX),
          };
        })
      : [],
    fields,
    frontFields: keys(r.frontFields, d.frontFields)
      .filter((k) => fields.includes(k))
      .slice(0, CARD_FRONT_FIELDS_MAX),
    showCustomerName: typeof r.showCustomerName === 'boolean' ? r.showCustomerName : d.showCustomerName,
    nearbyNotifications:
      typeof r.nearbyNotifications === 'boolean' ? r.nearbyNotifications : d.nearbyNotifications,
    homepageUrl: optionalUrl(r.homepageUrl),
  };
}

/** ensureContact: false deja pasar teléfono y correo ocultos, para que la validación lo rechace. */
export function normalizeRegistration(raw: unknown, { ensureContact = true } = {}): RegistrationConfig {
  const r = record(raw);
  const config = { ...DEFAULT_REGISTRATION };
  for (const field of REGISTRATION_FIELDS) config[field] = pick(r[field], FIELD_MODES, config[field]);
  // Sin teléfono ni correo no habría cómo encontrar al cliente en caja.
  if (ensureContact && config.phone === 'HIDDEN' && config.email === 'HIDDEN') config.email = 'OPTIONAL';
  return config;
}

/** Vencimiento de la tarjeta de un cliente; null si no vence. */
export function cardExpiryDate(validity: CardValidity, passCreatedAt: Date): Date | null {
  if (validity.type === 'FIXED_DATE' && validity.expiresAt) return new Date(validity.expiresAt);
  if (validity.type === 'AFTER_JOIN' && validity.days) {
    return new Date(passCreatedAt.getTime() + validity.days * 24 * 60 * 60 * 1000);
  }
  return null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ]{8,15}$/;
const INSTAGRAM = /^@?[A-Za-z0-9._]{1,30}$/;

export function linkUri(link: CardLink): string {
  const value = link.value.trim();
  switch (link.type) {
    case 'PHONE':
      return `tel:${value.replace(/\s/g, '')}`;
    case 'EMAIL':
      return `mailto:${value}`;
    case 'WHATSAPP':
      return `https://wa.me/${value.replace(/\D/g, '')}`;
    case 'INSTAGRAM':
      return `https://instagram.com/${value.replace(/^@/, '')}`;
    case 'WEBSITE':
      return value;
  }
}

const trimmedText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function linkProblem(raw: unknown, index: number): string | null {
  const link = record(raw);
  const n = index + 1;
  if (!trimmedText(link.label)) return `El enlace ${n} necesita un nombre`;
  const value = trimmedText(link.value);
  if (!value) return `El enlace ${n} necesita un destino`;
  switch (link.type) {
    case 'WEBSITE':
      return /^https:\/\/[^\s]+\.[^\s]+/i.test(value) ? null : `El enlace ${n} debe ser una dirección que empiece con https://`;
    case 'PHONE':
    case 'WHATSAPP':
      return PHONE.test(value) ? null : `El enlace ${n} debe ser un teléfono válido`;
    case 'EMAIL':
      return EMAIL.test(value) ? null : `El enlace ${n} debe ser un correo válido`;
    case 'INSTAGRAM':
      return INSTAGRAM.test(value) ? null : `El enlace ${n} debe ser un usuario de Instagram`;
  }
  return null;
}

export interface CardRulesContext {
  pointsEnabled: boolean;
  now?: Date;
}

export interface CardConfigIssue {
  step: 'TYPE' | 'INFO' | 'DESIGN' | 'DETAILS';
  message: string;
}

function typeProblems(type: CardType, pointsEnabled: boolean): string[] {
  return type === 'POINTS' && !pointsEnabled
    ? ['Los puntos no están habilitados para tu marca. Actívalos en Configuración.']
    : [];
}

function basicInfoProblems(config: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const name = trimmedText(config.name);
  if (name.length < CARD_NAME_MIN || name.length > CARD_NAME_MAX) {
    problems.push(`El nombre de la tarjeta debe tener entre ${CARD_NAME_MIN} y ${CARD_NAME_MAX} caracteres`);
  }

  return problems;
}

function rewardProblems(raw: unknown, type: CardType): string[] {
  const problems: string[] = [];
  const rewards: unknown[] = Array.isArray(raw) ? raw : [];
  if (rewards.length === 0) problems.push('Agrega al menos una recompensa');
  if (rewards.length > CARD_REWARDS_MAX) {
    problems.push(`Puedes tener hasta ${CARD_REWARDS_MAX} recompensas`);
  }
  const targetMax = type === 'POINTS' ? POINTS_TARGET_MAX : STAMPS_TARGET_MAX;
  const unit = balanceUnit(type);
  rewards.forEach((rawReward, i) => {
    const reward = record(rawReward);
    const name = trimmedText(reward.name);
    const label = name || `La recompensa ${i + 1}`;
    if (!name) problems.push(`Ponle nombre a la recompensa ${i + 1}`);
    else if (name.length > REWARD_NAME_MAX) {
      problems.push(`El nombre de "${label}" no puede superar los ${REWARD_NAME_MAX} caracteres`);
    }
    if (!integerInRange(reward.target, 1, targetMax)) {
      problems.push(`"${label}" debe costar entre 1 y ${targetMax} ${unit}`);
    }
  });
  return problems;
}

function integerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function balanceRuleProblems(welcomeBalance: unknown, type: CardType): string[] {
  const welcomeMax = type === 'POINTS' ? WELCOME_POINTS_MAX : WELCOME_STAMPS_MAX;
  return integerInRange(welcomeBalance, 0, welcomeMax)
    ? []
    : [`Los ${balanceUnit(type)} de bienvenida deben estar entre 0 y ${welcomeMax}`];
}

function validityProblems(raw: unknown, stampValidityDays: unknown, type: CardType, now: Date): string[] {
  const problems: string[] = [];
  const unit = balanceUnit(type);
  if (stampValidityDays !== null && !integerInRange(stampValidityDays, 1, STAMP_VALIDITY_DAYS_MAX)) {
    problems.push(`La vigencia de los ${unit} debe ser un número entero de días`);
  }

  const validity = record(raw);
  if (validity.type === 'FIXED_DATE') {
    const date = typeof validity.expiresAt === 'string' && validity.expiresAt ? new Date(validity.expiresAt) : null;
    if (!date || Number.isNaN(date.getTime())) problems.push('Elige la fecha en que vence la tarjeta');
    else if (date.getTime() <= now.getTime()) problems.push('La fecha de término de la tarjeta debe ser futura');
  }
  if (
    validity.type === 'AFTER_JOIN' &&
    !integerInRange(validity.days, 1, CARD_VALIDITY_DAYS_MAX)
  ) {
    problems.push('Indica cuántos días dura la tarjeta después de obtenerla');
  }
  return problems;
}

function registrationProblems(raw: unknown): string[] {
  const registration = record(raw);
  return registration.phone === 'HIDDEN' && registration.email === 'HIDDEN'
    ? ['Pide al menos el teléfono o el correo: es como se encuentra al cliente en caja']
    : [];
}

function detailProblems(raw: unknown): string[] {
  const problems: string[] = [];
  const details = record(raw);
  const links: unknown[] = Array.isArray(details.links) ? details.links : [];
  const sections: unknown[] = Array.isArray(details.sections) ? details.sections : [];
  const frontFields: unknown[] = Array.isArray(details.frontFields) ? details.frontFields : [];
  if (links.length > CARD_LINKS_MAX) problems.push(`Puedes agregar hasta ${CARD_LINKS_MAX} enlaces`);
  links.forEach((link, i) => {
    const problem = linkProblem(link, i);
    if (problem) problems.push(problem);
  });
  if (sections.length > CARD_SECTIONS_MAX) {
    problems.push(`Puedes agregar hasta ${CARD_SECTIONS_MAX} secciones`);
  }
  sections.forEach((rawSection, i) => {
    const section = record(rawSection);
    if (!trimmedText(section.header) || !trimmedText(section.body)) {
      problems.push(`La sección ${i + 1} necesita un título y un texto`);
    }
  });
  if (frontFields.length > CARD_FRONT_FIELDS_MAX) {
    problems.push(`En el frente caben hasta ${CARD_FRONT_FIELDS_MAX} datos además del saldo`);
  }
  if (details.homepageUrl && (typeof details.homepageUrl !== 'string' || !/^https:\/\//i.test(details.homepageUrl))) {
    problems.push('El sitio web debe empezar con https://');
  }
  return problems;
}

function designProblems(raw: unknown): string[] {
  const problems: string[] = [];
  const design = record(raw);
  for (const key of [
    'backgroundColor',
    'textColor',
    'labelColor',
    'stampFilledColor',
    'stampIconColor',
    'stampEmptyColor',
  ] as const) {
    if (!isHexColor(design[key])) problems.push('Los colores deben tener el formato #RRGGBB');
  }

  return problems;
}

function issuesForStep(step: CardConfigIssue['step'], problems: string[]): CardConfigIssue[] {
  return problems.map((message) => ({ step, message }));
}

/** Reglas de negocio asociadas al paso del editor donde se pueden corregir. */
export function cardConfigIssues(config: CardConfig, { pointsEnabled, now = new Date() }: CardRulesContext): CardConfigIssue[] {
  const input = record(config);
  const type = input.type === 'POINTS' ? 'POINTS' : 'STAMPS';
  const issues = [
    ...issuesForStep('TYPE', typeProblems(type, pointsEnabled)),
    ...issuesForStep('INFO', [
      ...basicInfoProblems(input),
      ...rewardProblems(input.rewards, type),
      ...balanceRuleProblems(input.welcomeBalance, type),
      ...validityProblems(input.validity, input.stampValidityDays, type, now),
      ...registrationProblems(input.registration),
    ]),
    ...issuesForStep('DETAILS', detailProblems(input.details)),
    ...issuesForStep('DESIGN', designProblems(input.design)),
  ];
  const seen = new Set<string>();
  return issues.filter(({ message }) => {
    if (seen.has(message)) return false;
    seen.add(message);
    return true;
  });
}

/** Reglas de negocio de la tarjeta, con mensajes para el dueño. Vacío = se puede guardar. */
export function cardConfigProblems(config: CardConfig, context: CardRulesContext): string[] {
  return cardConfigIssues(config, context).map(({ message }) => message);
}

// --- Tira de sellos del pase (heroImage de Google). La misma función dibuja la vista previa
// del editor y la imagen que sirve el backend, para que se vean idénticas.

export const STAMP_STRIP_WIDTH = 1032;
export const STAMP_STRIP_HEIGHT = 336;

export interface StampSlot {
  cx: number;
  cy: number;
}

export function stampGrid(
  target: number,
  width = STAMP_STRIP_WIDTH,
  height = STAMP_STRIP_HEIGHT,
): { radius: number; slots: StampSlot[] } {
  const total = Math.max(1, Math.min(STAMPS_TARGET_MAX, Math.floor(target)));
  const rows = total <= 6 ? 1 : total <= 14 ? 2 : 3;
  const cols = Math.ceil(total / rows);
  const padX = width * 0.06;
  const padY = height * 0.1;
  const cell = Math.min((width - padX * 2) / cols, (height - padY * 2) / rows);
  const radius = cell * 0.4;
  const slots: StampSlot[] = [];
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / cols);
    const inRow = row === rows - 1 ? total - cols * (rows - 1) : cols;
    const col = i - row * cols;
    const rowWidth = inRow * cell;
    slots.push({
      cx: (width - rowWidth) / 2 + cell * (col + 0.5),
      cy: (height - rows * cell) / 2 + cell * (row + 0.5),
    });
  }
  return { radius, slots };
}

const xml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** href de las imágenes: URL en el navegador, data URI en el backend. */
export interface StampStripImages {
  hero?: string | null;
  empty?: string | null;
  filled?: string | null;
}

function iconAt(icon: StampIcon, cx: number, cy: number, size: number, fill: string, opacity = 1): string {
  const scale = size / 24;
  return `<path d="${STAMP_ICON_PATHS[icon]}" fill="${fill}" fill-opacity="${opacity}" transform="translate(${(cx - size / 2).toFixed(2)} ${(cy - size / 2).toFixed(2)}) scale(${scale.toFixed(4)})"/>`;
}

export function renderStampStripSvg(
  design: CardDesign,
  target: number,
  filled: number,
  images: StampStripImages = {},
): string {
  const W = STAMP_STRIP_WIDTH;
  const H = STAMP_STRIP_HEIGHT;
  const { radius, slots } = stampGrid(target);
  const done = Math.max(0, Math.min(slots.length, Math.floor(filled)));
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="${design.backgroundColor}"/>`];

  if (images.hero) {
    parts.push(
      `<image href="${xml(images.hero)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`,
      `<rect width="${W}" height="${H}" fill="#000000" fill-opacity="0.28"/>`,
    );
  }

  slots.forEach(({ cx, cy }, i) => {
    const isFilled = i < done;
    const custom = isFilled ? images.filled : images.empty;
    if (custom) {
      const size = radius * 2;
      parts.push(
        `<image href="${xml(custom)}" x="${(cx - radius).toFixed(2)}" y="${(cy - radius).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}" preserveAspectRatio="xMidYMid meet"/>`,
      );
      return;
    }
    if (isFilled) {
      parts.push(
        `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius.toFixed(2)}" fill="${design.stampFilledColor}"/>`,
        iconAt(design.stampIcon, cx, cy, radius * 1.1, design.stampIconColor),
      );
    } else {
      const stroke = Math.max(2, radius * 0.08);
      parts.push(
        `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(radius - stroke / 2).toFixed(2)}" fill="${design.stampEmptyColor}" fill-opacity="0.12" stroke="${design.stampEmptyColor}" stroke-width="${stroke.toFixed(2)}"/>`,
        iconAt(design.stampIcon, cx, cy, radius * 1.1, design.stampEmptyColor, 0.55),
      );
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
}

export const FALLBACK_LOGO_SIZE = 660;

/** Logo de reemplazo (Google lo exige): el ícono del sello sobre el color de la tarjeta. */
export function renderFallbackLogoSvg(design: CardDesign): string {
  const S = FALLBACK_LOGO_SIZE;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="${design.backgroundColor}"/>${iconAt(design.stampIcon, S / 2, S / 2, S * 0.5, autoTextColor(design.backgroundColor))}</svg>`;
}
