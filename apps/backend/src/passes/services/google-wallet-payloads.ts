import { balanceUnit, linkUri, type CardFieldKey } from '@fidelity/shared';
import { cardLogoUrl, stampStripUrl } from '../../cards/card-urls.js';
import type { CardView } from '../../cards/card-program.js';
import type { CardClassData, PassData } from '../interfaces/pass-data.interface.js';

const LANGUAGE = 'es-419';
const TIME_ZONE = 'America/Santiago';
const MAX_MERCHANT_LOCATIONS = 10;

const localized = (value: string) => ({ defaultValue: { language: LANGUAGE, value } });

const image = (uri: string, description: string) => ({
  sourceUri: { uri },
  contentDescription: localized(description),
});

/**
 * Google solo acepta imágenes públicas por HTTPS. En local (localhost, 127.0.0.1, la IP de la red)
 * no lo son: se omiten y el pase se guarda igual, con sus colores y textos.
 */
export const isPublicImageUrl = (uri: string | null | undefined): uri is string =>
  !!uri && /^https:\/\//i.test(uri);

const formatDate = (date: Date) =>
  date.toLocaleDateString('es-CL', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });

/** Ids de los módulos de texto del objeto; la plantilla del frente los referencia. */
const FIELD_MODULE_ID: Record<CardFieldKey, string> = {
  REWARD: 'reward',
  PROGRESS: 'progress',
  STAMPS_EXPIRY: 'balance_expiry',
  CARD_EXPIRY: 'card_expiry',
  MEMBER_SINCE: 'member_since',
};
const BALANCE_MODULE_ID = 'balance';

function balanceLabel(card: CardView): string {
  return card.type === 'POINTS' ? 'Puntos' : 'Sellos';
}

export function statusText(card: CardView, activeBalance: number, target: number, currency?: 'STAMPS' | 'POINTS'): string {
  const actualCurrency = currency || (card.type === 'POINTS' ? 'POINTS' : 'STAMPS');
  if (activeBalance >= target) return '¡Premio desbloqueado!';
  const remaining = target - activeBalance;
  return `${remaining === 1 ? 'Falta' : 'Faltan'} ${remaining} ${balanceUnit(actualCurrency, remaining)}`;
}

/** Un campo solo existe si tiene sentido para la tarjeta (no hay "vence" en una que no vence). */
function availableFields(card: CardView): CardFieldKey[] {
  return card.details.fields.filter((key) => key !== 'CARD_EXPIRY' || card.validity.type !== 'UNLIMITED');
}

function cardTemplate(card: CardView) {
  const front = card.details.frontFields.filter((key) => availableFields(card).includes(key));
  const balanceModules = [];
  if (card.stampsEnabled) balanceModules.push('stamps_balance');
  if (card.pointsEnabled) balanceModules.push('points_balance');

  const items = [...balanceModules, ...front.map((key) => FIELD_MODULE_ID[key])].map((id) => ({
    firstValue: { fields: [{ fieldPath: `object.textModulesData['${id}']` }] },
  }));
  const rows = [];
  for (let i = 0; i < items.length; i += 3) {
    const chunk = items.slice(i, i + 3);
    if (chunk.length === 1) rows.push({ oneItem: { item: chunk[0] } });
    else if (chunk.length === 2) rows.push({ twoItems: { startItem: chunk[0], endItem: chunk[1] } });
    else rows.push({ threeItems: { startItem: chunk[0], middleItem: chunk[1], endItem: chunk[2] } });
  }
  return { cardTemplateOverride: { cardRowTemplateInfos: rows } };
}

/** Clase de Google Wallet: lo común a todas las tarjetas de la marca. Al editarla, Google la
 * actualiza en todos los pases ya guardados. */
export function buildLoyaltyClass(classId: string, data: CardClassData, baseUrl: string): Record<string, unknown> {
  const { card } = data;
  const { design, details } = card;
  const payload: Record<string, unknown> = {
    id: classId,
    issuerName: data.brandName,
    programName: card.name,
    // Si la clase ya tiene los nombres localizados, Google muestra esos y no issuerName/programName.
    localizedIssuerName: localized(data.brandName),
    localizedProgramName: localized(card.name),
    hexBackgroundColor: design.backgroundColor,
    reviewStatus: 'UNDER_REVIEW',
    countryCode: 'CL',
    classTemplateInfo: cardTemplate(card),
    textModulesData: details.sections.map((section, i) => ({
      id: `section_${i}`,
      header: section.header,
      body: section.body,
    })),
    linksModuleData: {
      uris: details.links.map((link, i) => ({ id: `link_${i}`, uri: linkUri(link), description: link.label })),
    },
  };
  const logo = cardLogoUrl(baseUrl, card);
  if (isPublicImageUrl(logo)) payload.programLogo = image(logo, data.brandName);
  if (isPublicImageUrl(design.wideLogoUrl)) payload.wideProgramLogo = image(design.wideLogoUrl, data.brandName);
  if (details.showCustomerName) payload.accountNameLabel = 'Titular';
  if (details.homepageUrl) payload.homepageUri = { uri: details.homepageUrl, description: 'Sitio web' };
  if (details.nearbyNotifications && data.locations.length > 0) {
    payload.merchantLocations = data.locations.slice(0, MAX_MERCHANT_LOCATIONS);
  }
  return payload;
}

function textModules(data: PassData) {
  const { card } = data.cardClass;
  const modules: { id: string; header: string; body: string }[] = [];
  
  if (data.stampsEnabled) {
    modules.push({
      id: 'stamps_balance',
      header: 'Sellos',
      body: data.rewardCurrency === 'STAMPS' ? `${data.activeStamps} de ${data.targetStamps}` : String(data.activeStamps),
    });
  }
  
  if (data.pointsEnabled) {
    modules.push({
      id: 'points_balance',
      header: 'Puntos',
      body: data.rewardCurrency === 'POINTS' ? `${data.activePoints} de ${data.targetStamps}` : String(data.activePoints),
    });
  }
  for (const key of availableFields(card)) {
    const id = FIELD_MODULE_ID[key];
    switch (key) {
      case 'REWARD':
        modules.push({ id, header: 'Premio', body: data.rewardName });
        break;
      case 'PROGRESS':
        const mainBalance = data.rewardCurrency === 'POINTS' ? data.activePoints : data.activeStamps;
        modules.push({ id, header: 'Estado', body: statusText(card, mainBalance, data.targetStamps, data.rewardCurrency) });
        break;
      case 'STAMPS_EXPIRY':
        modules.push({
          id,
          header: 'Próximo vencimiento',
          body: data.nextExpiryAt ? formatDate(data.nextExpiryAt) : (data.stampsEnabled && data.pointsEnabled ? 'Tus sellos y puntos no vencen' : `Tus ${balanceUnit(card.type)} no vencen`),
        });
        break;
      case 'CARD_EXPIRY':
        if (data.cardExpiresAt) modules.push({ id, header: 'Tarjeta válida hasta', body: formatDate(data.cardExpiresAt) });
        break;
      case 'MEMBER_SINCE':
        modules.push({ id, header: 'Cliente desde', body: formatDate(data.memberSince) });
        break;
    }
  }
  return modules;
}

export function buildObjectState(data: PassData, baseUrl: string): Record<string, unknown> {
  const { card } = data.cardClass;
  
  // En Google Wallet, loyaltyPoints es el "saldo principal" que a veces muestra la app
  // nativa. Priorizamos según el premio seleccionado.
  const mainBalance = data.rewardCurrency === 'POINTS' ? data.activePoints : data.activeStamps;
  const mainLabel = data.rewardCurrency === 'POINTS' ? 'Puntos' : 'Sellos';
  const mainTarget = data.targetStamps;
  
  const state: Record<string, unknown> = {
    loyaltyPoints: { label: mainLabel, balance: { int: mainBalance } },
    secondaryLoyaltyPoints: { label: 'Meta', balance: { int: mainTarget } },
    textModulesData: textModules(data),
  };

  const filled = Math.min(data.activeStamps, data.targetStamps);
  const strip = stampStripUrl(baseUrl, card, data.targetStamps, filled);
  if (card.type === 'STAMPS' && isPublicImageUrl(strip)) {
    state.heroImage = image(strip, `${filled} de ${data.targetStamps} sellos`);
  } else if (card.type === 'POINTS' && isPublicImageUrl(card.design.heroImageUrl)) {
    state.heroImage = image(card.design.heroImageUrl, card.name);
  }

  if (card.details.showCustomerName) state.accountName = data.customerLabel;
  if (data.cardExpiresAt) state.validTimeInterval = { end: { date: data.cardExpiresAt.toISOString() } };
  return state;
}

export function buildLoyaltyObject(
  objectId: string,
  classId: string,
  data: PassData,
  baseUrl: string,
): Record<string, unknown> {
  const { showCustomerName } = data.cardClass.card.details;
  return {
    id: objectId,
    classId,
    state: 'ACTIVE',
    barcode: {
      type: 'QR_CODE',
      value: data.passToken,
      ...(showCustomerName ? { alternateText: data.customerLabel } : {}),
    },
    ...buildObjectState(data, baseUrl),
  };
}
