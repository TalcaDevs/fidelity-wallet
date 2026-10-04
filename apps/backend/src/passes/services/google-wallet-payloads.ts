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

export function statusText(card: CardView, active: number, target: number): string {
  if (active >= target) return '¡Premio desbloqueado!';
  const remaining = target - active;
  return `${remaining === 1 ? 'Falta' : 'Faltan'} ${remaining} ${balanceUnit(card.type, remaining)}`;
}

/** Un campo solo existe si tiene sentido para la tarjeta (no hay "vence" en una que no vence). */
function availableFields(card: CardView): CardFieldKey[] {
  return card.details.fields.filter((key) => key !== 'CARD_EXPIRY' || card.validity.type !== 'UNLIMITED');
}

function cardTemplate(card: CardView) {
  const front = card.details.frontFields.filter((key) => availableFields(card).includes(key));
  const items = [BALANCE_MODULE_ID, ...front.map((key) => FIELD_MODULE_ID[key])].map((id) => ({
    firstValue: { fields: [{ fieldPath: `object.textModulesData['${id}']` }] },
  }));
  const row =
    items.length === 1
      ? { oneItem: { item: items[0] } }
      : items.length === 2
        ? { twoItems: { startItem: items[0], endItem: items[1] } }
        : { threeItems: { startItem: items[0], middleItem: items[1], endItem: items[2] } };
  return { cardTemplateOverride: { cardRowTemplateInfos: [row] } };
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
  const label = balanceLabel(card);
  const modules: { id: string; header: string; body: string }[] = [
    {
      id: BALANCE_MODULE_ID,
      header: label,
      body: card.type === 'POINTS' ? String(data.activeStamps) : `${data.activeStamps} de ${data.targetStamps}`,
    },
  ];
  for (const key of availableFields(card)) {
    const id = FIELD_MODULE_ID[key];
    switch (key) {
      case 'REWARD':
        modules.push({ id, header: 'Premio', body: data.rewardName });
        break;
      case 'PROGRESS':
        modules.push({ id, header: 'Estado', body: statusText(card, data.activeStamps, data.targetStamps) });
        break;
      case 'STAMPS_EXPIRY':
        modules.push({
          id,
          header: 'Próximo vencimiento',
          body: data.nextExpiryAt ? formatDate(data.nextExpiryAt) : `Tus ${balanceUnit(card.type)} no vencen`,
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

/** Lo del objeto que cambia con cada sello o al editar la tarjeta: va igual en el alta y en el PATCH. */
export function buildObjectState(data: PassData, baseUrl: string): Record<string, unknown> {
  const { card } = data.cardClass;
  const state: Record<string, unknown> = {
    loyaltyPoints: { label: balanceLabel(card), balance: { int: data.activeStamps } },
    secondaryLoyaltyPoints: { label: 'Meta', balance: { int: data.targetStamps } },
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
