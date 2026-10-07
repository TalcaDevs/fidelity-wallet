import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is missing.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = 'password123';
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const daysAgo = (days, hour = 13) => {
  const d = new Date(NOW - days * DAY_MS);
  d.setUTCHours(hour + 3, (days * 17) % 60, 0, 0);
  return d;
};

// Cada marca respeta los límites de su plan (packages/shared/src/plans.ts): el backend bloquea
// crecer más allá, así que un seed fuera de límite dejaría el panel en un estado imposible.
const BRANDS = [
  {
    owner: { email: 'owner@example.com', fullName: 'Dueño Café Demo' },
    name: 'Café Demo',
    planId: 'PRO',
    stampValidityDays: 30,
    locations: [
      { key: 'centro', name: 'Café Demo', slug: 'cafe-demo', address: 'Merced 838', commune: 'Santiago', region: 'Metropolitana', latitude: -33.4372, longitude: -70.6454 },
      { key: 'providencia', name: 'Café Demo — Providencia', slug: 'cafe-demo-providencia', address: 'Av. Providencia 2124', commune: 'Providencia', region: 'Metropolitana', latitude: -33.4213, longitude: -70.6088 },
      { key: 'nunoa', name: 'Café Demo — Ñuñoa', slug: 'cafe-demo-nunoa', address: 'Av. Irarrázaval 3450', commune: 'Ñuñoa', region: 'Metropolitana', latitude: -33.4541, longitude: -70.5965 },
    ],
    promotions: [
      { name: 'Café', targetStamps: 5, rewardName: 'Café gratis' },
      { name: 'Almuerzo', targetStamps: 10, rewardName: 'Almuerzo gratis' },
    ],
    staff: [
      { email: 'cajero1@example.com', fullName: 'Cajero Turno Mañana', location: 'centro' },
      { email: 'cajero2@example.com', fullName: 'Cajero Turno Tarde', location: 'centro' },
      { email: 'mesero@example.com', fullName: 'Mesero Salón', location: 'providencia' },
      { email: 'staff@example.com', fullName: 'Staff General', location: 'providencia' },
      { email: 'barista@example.com', fullName: 'Barista Ñuñoa', location: 'nunoa' },
    ],
    customers: 24,
    tickets: [
      { category: 'SCANNER', priority: 'HIGH', status: 'OPEN', location: 'providencia', daysAgo: 1, description: 'El escáner del local de Providencia no enciende la cámara en la tablet desde ayer.' },
      {
        category: 'WALLET', priority: 'NORMAL', status: 'WAITING_ON_MERCHANT', location: 'centro', daysAgo: 3,
        description: 'Una clienta dice que su tarjeta no se actualizó en Apple Wallet después de sellar.',
        reply: '¿Nos puedes indicar el RUT de la clienta y la hora aproximada del sello para revisarlo?',
      },
      { category: 'BILLING', priority: 'LOW', status: 'RESOLVED', daysAgo: 9, description: 'Quiero saber si puedo pasar al plan Negocio a mitad de mes.', reply: 'Sí, el cambio aplica de inmediato y se prorratea.' },
    ],
  },
  {
    owner: { email: 'heladeria@example.com', fullName: 'Dueña Heladería Sur' },
    name: 'Heladería Sur',
    planId: 'TRIAL',
    trialEndsInDays: 4,
    stampValidityDays: 60,
    locations: [
      { key: 'concepcion', name: 'Heladería Sur', slug: 'heladeria-sur', address: 'Barros Arana 780', commune: 'Concepción', region: 'Biobío', latitude: -36.8270, longitude: -73.0498 },
    ],
    promotions: [{ name: 'Helado', targetStamps: 6, rewardName: 'Cono simple gratis' }],
    staff: [{ email: 'heladeria.caja@example.com', fullName: 'Caja Heladería', location: 'concepcion' }],
    customers: 8,
    tickets: [
      { category: 'ACCOUNT', priority: 'URGENT', status: 'OPEN', location: 'concepcion', daysAgo: 0, description: 'Mi prueba vence esta semana y necesito saber cómo contratar sin perder a mis clientes.' },
    ],
  },
  {
    owner: { email: 'panaderia@example.com', fullName: 'Dueño Panadería Norte' },
    name: 'Panadería Norte',
    planId: 'STARTER',
    status: 'SUSPENDED',
    stampValidityDays: null,
    locations: [
      { key: 'antofagasta', name: 'Panadería Norte', slug: 'panaderia-norte', address: 'Av. Grecia 1520', commune: 'Antofagasta', region: 'Antofagasta', latitude: -23.6600, longitude: -70.4000 },
      { key: 'serena', name: 'Panadería Norte — La Serena', slug: 'panaderia-norte-serena', address: 'Av. Francisco de Aguirre 350', commune: 'La Serena', region: 'Coquimbo', latitude: -29.9045, longitude: -71.2489 },
    ],
    promotions: [{ name: 'Marraqueta', targetStamps: 8, rewardName: '1 kg de pan gratis' }],
    staff: [{ email: 'panaderia.caja@example.com', fullName: 'Caja Panadería', location: 'antofagasta' }],
    customers: 5,
    tickets: [],
  },
  {
    // Tarjeta de puntos y sin clientes: sirve para probar los puntos y para cambiar el tipo de
    // tarjeta en /admin/card (con clientes con saldo el cambio está bloqueado).
    owner: { email: 'libreria@example.com', fullName: 'Dueña Librería Puntos' },
    name: 'Librería Puntos',
    planId: 'TRIAL',
    trialEndsInDays: 20,
    stampValidityDays: 365,
    pointsEnabled: true,
    card: { type: 'POINTS', name: 'Club Librería' },
    locations: [
      { key: 'valparaiso', name: 'Librería Puntos', slug: 'libreria-puntos', address: 'Av. Pedro Montt 2030', commune: 'Valparaíso', region: 'Valparaíso', latitude: -33.0458, longitude: -71.6197 },
    ],
    promotions: [
      { name: 'Marcapáginas', targetStamps: 20, rewardName: 'Marcapáginas de regalo' },
      { name: 'Libro', targetStamps: 150, rewardName: 'Libro de bolsillo gratis' },
    ],
    staff: [{ email: 'libreria.caja@example.com', fullName: 'Caja Librería', location: 'valparaiso' }],
    customers: 0,
    tickets: [],
  },
];

const PLATFORM_ADMIN = { email: 'admin@example.com', fullName: 'Admin interno' };

// PRNG con semilla fija: el mismo seed produce siempre los mismos datos.
let state = 20260930;
const random = () => {
  state = (state * 1103515245 + 12345) % 2 ** 31;
  return state / 2 ** 31;
};
const pick = (list) => list[Math.floor(random() * list.length)];

let rutBase = 15_000_000;
function nextRut() {
  rutBase += 7919;
  let sum = 0;
  let factor = 2;
  for (const digit of String(rutBase).split('').reverse()) {
    sum += Number(digit) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (sum % 11);
  return `${rutBase}-${dv === 11 ? '0' : dv === 10 ? 'K' : dv}`;
}
let phoneBase = 81_000_000;
const nextPhone = () => `+569${(phoneBase += 1301)}`;

// Sin random(): el perfil sale de un contador para no correr la secuencia del resto del seed.
const FIRST_NAMES = ['María', 'José', 'Camila', 'Matías', 'Valentina', 'Benjamín', 'Fernanda', 'Diego'];
const LAST_NAMES = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras'];
let customerSeq = 0;
function nextProfile() {
  customerSeq++;
  // Uno de cada tres no deja nombre, correo ni cumpleaños: son opcionales en el alta.
  if (customerSeq % 3 === 0) return {};
  return {
    name: `${FIRST_NAMES[customerSeq % FIRST_NAMES.length]} ${LAST_NAMES[customerSeq % LAST_NAMES.length]}`,
    email: `cliente${customerSeq}@example.com`,
    birthDay: (customerSeq % 28) + 1,
    birthMonth: (customerSeq % 12) + 1,
    ...(customerSeq % 2 === 0 ? { birthYear: 1980 + (customerSeq % 25) } : {}),
  };
}

async function check(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

async function createUser(email, metadata) {
  let { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error && error.message.includes('already been registered')) {
    let page = 1;
    let existing = null;
    while (!existing) {
      const listRes = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (listRes.error) break;
      if (!listRes.data || !listRes.data.users || listRes.data.users.length === 0) break;
      
      existing = listRes.data.users.find(u => u.email === email);
      if (existing) break;
      page++;
    }

    if (existing) {
      await supabase.auth.admin.deleteUser(existing.id);
      const retry = await supabase.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: metadata,
      });
      data = retry.data;
      error = retry.error;
    }
  }

  if (error) throw new Error(`Error creating ${email}: ${error.message}`);
  return data.user;
}

const locationFields = ({ key: _key, ...fields }) => fields;

/** Sin merchant_id en la metadata, handle_new_user crea Brand + Merchant + LoyaltyProgram + OWNER con id = auth.users.id. */
async function seedBrand(spec) {
  const owner = await createUser(spec.owner.email, { full_name: spec.owner.fullName });
  const brandId = owner.id;

  await check(
    supabase
      .from('Brand')
      .update({
        name: spec.name,
        planId: spec.planId,
        status: spec.status ?? 'ACTIVE',
        ...(spec.pointsEnabled && { pointsEnabled: true }),
        ...(spec.trialEndsInDays !== undefined && { trialEndsAt: new Date(NOW + spec.trialEndsInDays * DAY_MS).toISOString() }),
      })
      .eq('id', brandId),
  );

  const [first, ...rest] = spec.locations;
  await check(supabase.from('Merchant').update(locationFields(first)).eq('id', brandId));
  const locationIds = { [first.key]: brandId };
  for (const location of rest) {
    const [row] = await check(supabase.from('Merchant').insert({ brandId, ...locationFields(location) }).select('id'));
    locationIds[location.key] = row.id;
  }

  const [program] = await check(
    supabase
      .from('LoyaltyProgram')
      .update({ stampValidityDays: spec.stampValidityDays, ...spec.card })
      .eq('brandId', brandId)
      .select('id'),
  );
  const promotions = await check(
    supabase
      .from('Promotion')
      .insert(spec.promotions.map((p) => ({ ...p, programId: program.id, isActive: true })))
      .select('id, targetStamps'),
  );

  // merchant_id en la metadata solo evita que el trigger les cree una marca propia; la
  // membresía STAFF se inserta acá con la service_role key, igual que hace StaffService.
  const staffIds = [];
  for (const staff of spec.staff) {
    const merchantId = locationIds[staff.location];
    const user = await createUser(staff.email, { full_name: staff.fullName, merchant_id: merchantId });
    await check(supabase.from('BrandMember').insert({ userId: user.id, brandId, merchantId, role: 'STAFF' }));
    staffIds.push({ userId: user.id, merchantId });
  }

  const ctx = { brandId, programId: program.id, promotions, staffIds, validity: spec.stampValidityDays };
  const activity = await seedCustomers(ctx, spec.customers, Object.values(locationIds));
  await seedTickets(brandId, owner.id, locationIds, spec.tickets);

  console.log(
    `${spec.name} (${spec.planId}${spec.status === 'SUSPENDED' ? ', suspendida' : ''}): ` +
      `${spec.locations.length} locales, ${spec.staff.length} staff, ${spec.customers} clientes, ` +
      `${activity.stamps} sellos, ${activity.redemptions} canjes, ${spec.tickets.length} tickets · owner ${spec.owner.email}`,
  );
}

/**
 * Clientes con sellos repartidos en los últimos 20 días entre los locales de la marca. Un cliente
 * con sellos de sobra canjea la promoción más barata: se consumen sus sellos más antiguos (FIFO).
 */
async function seedCustomers(ctx, count, merchantIds) {
  let stamps = 0;
  let redemptions = 0;
  for (let i = 0; i < count; i++) {
    const joinedDaysAgo = Math.floor(random() * 20);
    const homeMerchant = pick(merchantIds);
    const [customer] = await check(
      supabase
        .from('Customer')
        .insert({ rut: nextRut(), phone: nextPhone(), ...nextProfile(), termsAcceptedAt: daysAgo(joinedDaysAgo).toISOString(), termsVersion: '2026-10-03', createdAt: daysAgo(joinedDaysAgo).toISOString() })
        .select('id'),
    );
    const [pass] = await check(
      supabase
        .from('Pass')
        .insert({
          customerId: customer.id,
          programId: ctx.programId,
          brandId: ctx.brandId,
          merchantId: homeMerchant,
          passToken: randomBytes(32).toString('hex'),
          createdAt: daysAgo(joinedDaysAgo, 12).toISOString(),
          updatedAt: daysAgo(0).toISOString(),
        })
        .select('id'),
    );

    const visits = Array.from({ length: Math.floor(random() * 9) }, () =>
      daysAgo(Math.floor(random() * (joinedDaysAgo + 1)), 10 + Math.floor(random() * 9)),
    ).sort((x, y) => x.getTime() - y.getTime());
    const earned = [];
    for (const at of visits) {
      const staff = pick(ctx.staffIds);
      const merchantId = random() < 0.7 ? homeMerchant : pick(merchantIds);
      const [scan] = await check(
        supabase
          .from('Scan')
          .insert({
            passId: pass.id,
            brandId: ctx.brandId,
            programId: ctx.programId,
            merchantId,
            type: 'STAMP_ADDED',
            createdByUserId: staff.userId,
            createdAt: at.toISOString(),
            purchaseAmount: stamps % 2 === 0 ? 3000 + (stamps % 10) * 1500 : null,
          })
          .select('id'),
      );
      const [stamp] = await check(
        supabase
          .from('Stamp')
          .insert({
            passId: pass.id,
            brandId: ctx.brandId,
            programId: ctx.programId,
            merchantId,
            earnedAt: at.toISOString(),
            expiresAt: ctx.validity ? new Date(at.getTime() + ctx.validity * DAY_MS).toISOString() : null,
            sourceScanId: scan.id,
            createdByUserId: staff.userId,
          })
          .select('id, earnedAt'),
      );
      earned.push(stamp);
      stamps++;
    }

    const cheapest = ctx.promotions.reduce((a, b) => (a.targetStamps <= b.targetStamps ? a : b));
    if (earned.length >= cheapest.targetStamps) {
      const staff = pick(ctx.staffIds);
      const last = new Date(earned[earned.length - 1].earnedAt);
      const at = new Date(Math.min(NOW - 60_000, last.getTime() + 60 * 60 * 1000));
      const [scan] = await check(
        supabase
          .from('Scan')
          .insert({ passId: pass.id, brandId: ctx.brandId, programId: ctx.programId, merchantId: staff.merchantId, type: 'REWARD_REDEEMED', promotionId: cheapest.id, createdByUserId: staff.userId, createdAt: at.toISOString() })
          .select('id'),
      );
      await check(
        supabase
          .from('Stamp')
          .update({ consumedAt: at.toISOString(), consumedByScanId: scan.id })
          .in('id', earned.slice(0, cheapest.targetStamps).map((s) => s.id)),
      );
      redemptions++;
    }
  }
  return { stamps, redemptions };
}

async function seedTickets(brandId, ownerId, locationIds, tickets) {
  for (const t of tickets) {
    const createdAt = daysAgo(t.daysAgo, 11);
    const repliedAt = new Date(createdAt.getTime() + 3 * 60 * 60 * 1000);
    const resolved = t.status === 'RESOLVED';
    const [ticket] = await check(
      supabase
        .from('Ticket')
        .insert({
          brandId,
          merchantId: t.location ? locationIds[t.location] : null,
          createdByUserId: ownerId,
          category: t.category,
          priority: t.priority,
          status: t.status,
          description: t.description,
          createdAt: createdAt.toISOString(),
          lastMessageAt: (t.reply ? repliedAt : createdAt).toISOString(),
          lastPublicReplyAt: t.reply ? repliedAt.toISOString() : null,
          resolvedAt: resolved ? repliedAt.toISOString() : null,
        })
        .select('id'),
    );
    if (t.reply && adminId) {
      await check(
        supabase.from('TicketMessage').insert({ ticketId: ticket.id, authorUserId: adminId, authorType: 'PLATFORM', body: t.reply, createdAt: repliedAt.toISOString() }),
      );
    }
  }
}

let adminId = null;

async function main() {
  // El admin primero: responde los tickets del seed. Sin marca propia (platform_admin en la metadata).
  const admin = await createUser(PLATFORM_ADMIN.email, { full_name: PLATFORM_ADMIN.fullName, platform_admin: true });
  await check(supabase.from('PlatformAdmin').insert({ userId: admin.id, role: 'SUPERADMIN' }));
  adminId = admin.id;
  console.log(`PlatformAdmin SUPERADMIN: ${PLATFORM_ADMIN.email}`);

  for (const brand of BRANDS) await seedBrand(brand);
  console.log(`Contraseña de todas las cuentas: ${PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
