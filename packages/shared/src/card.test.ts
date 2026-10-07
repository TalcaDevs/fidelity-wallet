import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CARD_DESIGN,
  DEFAULT_CARD_DETAILS,
  DEFAULT_REGISTRATION,
  autoTextColor,
  cardConfigIssues,
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
  stampsEnabled: true,
  pointsEnabled: false,
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
    const problems = cardConfigProblems(config({ type: 'POINTS', pointsEnabled: true, stampsEnabled: false, rewards: [{ name: 'Postre', target: 500 }] }), {
      pointsEnabled: false,
      now,
    });
    expect(problems.join()).toMatch(/no están habilitados/);
    expect(
      cardConfigProblems(config({ type: 'POINTS', pointsEnabled: true, stampsEnabled: false, rewards: [{ name: 'Postre', target: 500 }] }), {
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

  it('keeps error ordering across domains and removes repeated color errors', () => {
    const problems = cardConfigProblems(
      config({
        type: 'POINTS',
        pointsEnabled: true,
        stampsEnabled: false,
        name: ' ',
        rewards: [{ name: ' ', target: 0 }],
        welcomeBalance: 100_001,
        stampValidityDays: 0,
        validity: { type: 'FIXED_DATE', expiresAt: now.toISOString(), days: null },
        registration: { ...DEFAULT_REGISTRATION, phone: 'HIDDEN', email: 'HIDDEN' },
        details: {
          ...DEFAULT_CARD_DETAILS,
          links: [{ type: 'EMAIL', label: 'Correo', value: 'inválido' }],
          sections: [{ header: ' ', body: 'Texto' }],
          frontFields: ['REWARD', 'PROGRESS', 'CARD_EXPIRY'],
          homepageUrl: 'http://cafe.cl',
        },
        design: { ...DEFAULT_CARD_DESIGN, backgroundColor: 'red', textColor: 'white' },
      }),
      { pointsEnabled: false, now },
    );
    expect(problems).toEqual([
      'Los puntos no están habilitados para tu marca. Actívalos en Configuración.',
      'El nombre de la tarjeta debe tener entre 2 y 40 caracteres',
      'Ponle nombre a la recompensa 1',
      '"La recompensa 1" debe costar entre 1 y 1000000 puntos',
      'Los puntos de bienvenida deben estar entre 0 y 100000',
      'La vigencia de los puntos debe ser un número entero de días',
      'La fecha de término de la tarjeta debe ser futura',
      'Pide al menos el teléfono o el correo: es como se encuentra al cliente en caja',
      'El enlace 1 debe ser un correo válido',
      'La sección 1 necesita un título y un texto',
      'En el frente caben hasta 2 datos además del saldo',
      'El sitio web debe empezar con https://',
      'Los colores deben tener el formato #RRGGBB',
    ]);
  });

  it('accepts the maximum point balances and validity durations', () => {
    expect(
      cardConfigProblems(
        config({
          type: 'POINTS',
          pointsEnabled: true,
          stampsEnabled: false,
          rewards: [{ name: 'Premio', target: 1_000_000 }],
          welcomeBalance: 100_000,
          stampValidityDays: 3650,
          validity: { type: 'AFTER_JOIN', expiresAt: null, days: 3650 },
        }),
        { pointsEnabled: true, now },
      ),
    ).toEqual([]);
  });

  it('returns problems instead of throwing for unexpected top-level input types', () => {
    for (const raw of [null, undefined, false, 42, 'tarjeta', [], Symbol('card')]) {
      expect(cardConfigProblems(raw as unknown as CardConfig, { pointsEnabled: false, now })).not.toEqual([]);
    }
  });

  it('handles malformed nested fields without coercing them into valid values', () => {
    const raw = {
      ...config(),
      rewards: [null, { name: 123, target: '10' }],
      validity: { type: 'FIXED_DATE', expiresAt: Symbol('date') },
      registration: null,
      details: {
        links: [{ label: null }, { label: 'Web', value: Symbol('url') }],
        sections: [null],
        frontFields: null,
        homepageUrl: {},
      },
      design: null,
    };
    expect(cardConfigProblems(raw as unknown as CardConfig, { pointsEnabled: false, now })).toEqual([
      'Ponle nombre a la recompensa 1',
      '"La recompensa 1" debe costar entre 1 y 30 sellos',
      'Ponle nombre a la recompensa 2',
      '"La recompensa 2" debe costar entre 1 y 30 sellos',
      'Elige la fecha en que vence la tarjeta',
      'El enlace 1 necesita un nombre',
      'El enlace 2 necesita un destino',
      'La sección 1 necesita un título y un texto',
      'El sitio web debe empezar con https://',
      'Los colores deben tener el formato #RRGGBB',
    ]);
  });
});

describe('cardConfigIssues', () => {
  it('links each error to the step that can correct it without changing messages', () => {
    const card = config({
      type: 'POINTS',
      name: ' ',
      rewards: [],
      welcomeBalance: -1,
      stampValidityDays: 0,
      validity: { type: 'AFTER_JOIN', expiresAt: null, days: 0 },
      registration: { ...DEFAULT_REGISTRATION, phone: 'HIDDEN', email: 'HIDDEN' },
      details: { ...DEFAULT_CARD_DETAILS, homepageUrl: 'http://cafe.cl' },
      design: { ...DEFAULT_CARD_DESIGN, backgroundColor: 'red', textColor: 'white' },
    });
    const context = { pointsEnabled: false, now };
    const issues = cardConfigIssues(card, context);
    expect(issues.map(({ step }) => step)).toEqual([
      'TYPE', 'INFO', 'INFO', 'INFO', 'INFO', 'INFO', 'INFO', 'DETAILS', 'DESIGN',
    ]);
    expect(issues.at(-2)).toEqual({ step: 'DETAILS', message: 'El sitio web debe empezar con https://' });
    expect(issues.at(-1)).toEqual({ step: 'DESIGN', message: 'Los colores deben tener el formato #RRGGBB' });
    expect(issues.map(({ message }) => message)).toEqual(cardConfigProblems(card, context));
  });

  it('keeps the first occurrence when two rewards produce the same error', () => {
    const card = config({ rewards: [{ name: 'Café', target: 0 }, { name: 'Café', target: 31 }] });
    expect(cardConfigIssues(card, { pointsEnabled: false, now })).toEqual([
      { step: 'INFO', message: '"Café" debe costar entre 1 y 30 sellos' },
    ]);
    expect(cardConfigIssues(config(), { pointsEnabled: false, now })).toEqual([]);
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
