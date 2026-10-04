import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CARD_DESIGN,
  DEFAULT_CARD_DETAILS,
  DEFAULT_REGISTRATION,
  autoTextColor,
  cardConfigProblems,
  cardExpiryDate,
  contrastRatio,
  linkUri,
  normalizeDesign,
  normalizeDetails,
  normalizeRegistration,
  pointsForAmount,
  renderStampStripSvg,
  stampGrid,
  type CardConfig,
} from './card.js';

const now = new Date('2026-10-03T12:00:00Z');

const config = (overrides: Partial<CardConfig> = {}): CardConfig => ({
  type: 'STAMPS',
  name: 'Tarjeta Café',
  rewards: [{ name: 'Café gratis', target: 10 }],
  welcomeBalance: 0,
  dailyStampLimit: true,
  stampValidityDays: null,
  validity: { type: 'UNLIMITED', expiresAt: null, days: null },
  registration: DEFAULT_REGISTRATION,
  design: DEFAULT_CARD_DESIGN,
  details: DEFAULT_CARD_DETAILS,
  ...overrides,
});

describe('pointsForAmount', () => {
  it('gives one point per full block of pesos', () => {
    expect(pointsForAmount(12_500, 1000)).toBe(12);
    expect(pointsForAmount(999, 1000)).toBe(0);
    expect(pointsForAmount(0, 1000)).toBe(0);
    expect(pointsForAmount(-5, 1000)).toBe(0);
  });
});

describe('cardConfigProblems', () => {
  it('accepts the defaults', () => {
    expect(cardConfigProblems(config(), { pointsEnabled: false, now })).toEqual([]);
  });

  it('rejects points when the brand does not have them enabled', () => {
    const problems = cardConfigProblems(config({ type: 'POINTS', rewards: [{ name: 'Postre', target: 500 }] }), {
      pointsEnabled: false,
      now,
    });
    expect(problems.join()).toMatch(/no están habilitados/);
    expect(
      cardConfigProblems(config({ type: 'POINTS', rewards: [{ name: 'Postre', target: 500 }] }), {
        pointsEnabled: true,
        now,
      }),
    ).toEqual([]);
  });

  it('limits stamp rewards to what fits in the strip', () => {
    const problems = cardConfigProblems(config({ rewards: [{ name: 'Café', target: 31 }] }), {
      pointsEnabled: false,
      now,
    });
    expect(problems).toEqual(['"Café" debe costar entre 1 y 30 sellos']);
  });

  it('requires at least one reward and a contact field', () => {
    const problems = cardConfigProblems(
      config({ rewards: [], registration: { ...DEFAULT_REGISTRATION, phone: 'HIDDEN', email: 'HIDDEN' } }),
      { pointsEnabled: false, now },
    );
    expect(problems).toHaveLength(2);
  });

  it('validates the card validity', () => {
    const past = config({ validity: { type: 'FIXED_DATE', expiresAt: '2026-01-01T00:00:00Z', days: null } });
    expect(cardConfigProblems(past, { pointsEnabled: false, now })).toEqual([
      'La fecha de término de la tarjeta debe ser futura',
    ]);
    const noDays = config({ validity: { type: 'AFTER_JOIN', expiresAt: null, days: null } });
    expect(cardConfigProblems(noDays, { pointsEnabled: false, now })).toHaveLength(1);
  });

  it('validates links by type', () => {
    const problems = cardConfigProblems(
      config({
        details: {
          ...DEFAULT_CARD_DETAILS,
          links: [
            { type: 'WEBSITE', label: 'Web', value: 'http://inseguro.cl' },
            { type: 'EMAIL', label: 'Correo', value: 'hola@cafe.cl' },
            { type: 'INSTAGRAM', label: 'IG', value: '@cafe.central' },
          ],
        },
      }),
      { pointsEnabled: false, now },
    );
    expect(problems).toEqual(['El enlace 1 debe ser una dirección que empiece con https://']);
  });
});

describe('normalizers', () => {
  it('fill defaults and drop unknown values', () => {
    const design = normalizeDesign({ backgroundColor: '#abcdef', stampIcon: 'NOPE', logoUrl: 'javascript:alert(1)' });
    expect(design.backgroundColor).toBe('#ABCDEF');
    expect(design.stampIcon).toBe('STAR');
    expect(design.logoUrl).toBeNull();

    const details = normalizeDetails({ fields: ['REWARD', 'X'], frontFields: ['PROGRESS', 'REWARD'] });
    expect(details.fields).toEqual(['REWARD']);
    expect(details.frontFields).toEqual(['REWARD']);
  });

  it('never hides both phone and email', () => {
    expect(normalizeRegistration({ phone: 'HIDDEN', email: 'HIDDEN' })).toMatchObject({
      phone: 'HIDDEN',
      email: 'OPTIONAL',
    });
  });
});

describe('helpers', () => {
  it('builds link uris', () => {
    expect(linkUri({ type: 'WHATSAPP', label: 'WA', value: '+56 9 1234 5678' })).toBe('https://wa.me/56912345678');
    expect(linkUri({ type: 'INSTAGRAM', label: 'IG', value: '@cafe' })).toBe('https://instagram.com/cafe');
    expect(linkUri({ type: 'PHONE', label: 'Tel', value: '+56 2 2345 6789' })).toBe('tel:+56223456789');
  });

  it('computes contrast like WCAG', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0);
    expect(autoTextColor('#A3472F')).toBe('#FFFFFF');
    expect(autoTextColor('#EADFCB')).toBe('#000000');
  });

  it('computes when a card expires', () => {
    const joined = new Date('2026-01-01T00:00:00Z');
    expect(cardExpiryDate({ type: 'UNLIMITED', expiresAt: null, days: null }, joined)).toBeNull();
    expect(cardExpiryDate({ type: 'AFTER_JOIN', expiresAt: null, days: 30 }, joined)?.toISOString()).toBe(
      '2026-01-31T00:00:00.000Z',
    );
  });
});

describe('stamp strip', () => {
  it('lays out stamps in up to three rows', () => {
    expect(stampGrid(5).slots).toHaveLength(5);
    const ten = stampGrid(10).slots;
    expect(new Set(ten.map((s) => s.cy.toFixed(0))).size).toBe(2);
    expect(new Set(stampGrid(30).slots.map((s) => s.cy.toFixed(0))).size).toBe(3);
  });

  it('draws filled and empty stamps', () => {
    const svg = renderStampStripSvg(DEFAULT_CARD_DESIGN, 10, 3);
    expect(svg.match(/<circle/g)).toHaveLength(10);
    expect(svg.match(/fill-opacity="0\.12"/g)).toHaveLength(7);
  });

  it('escapes image hrefs', () => {
    const svg = renderStampStripSvg(DEFAULT_CARD_DESIGN, 2, 1, { hero: 'https://x.cl/a.jpg?a=1&b="2"' });
    expect(svg).toContain('a=1&amp;b=&quot;2&quot;');
  });
});
