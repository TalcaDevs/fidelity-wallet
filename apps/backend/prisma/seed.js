import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is missing.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const PASSWORD = 'password123';

const OWNER = { email: 'owner@example.com', fullName: 'Dueño / Administrador' };

const PLATFORM_ADMIN = { email: 'admin@example.com', fullName: 'Admin interno' };

const BRAND = { name: 'Café Demo', stampValidityDays: 30 };

const LOCATIONS = [
  { key: 'centro', name: 'Café Demo', slug: 'cafe-demo', commune: 'Santiago', region: 'Metropolitana' },
  { key: 'providencia', name: 'Café Demo — Providencia', slug: 'cafe-demo-providencia', commune: 'Providencia', region: 'Metropolitana' },
];

const PROMOTIONS = [
  { name: 'Café', targetStamps: 5, rewardName: 'Café gratis' },
  { name: 'Almuerzo', targetStamps: 10, rewardName: 'Almuerzo gratis' },
];

const STAFF = [
  { email: 'cajero1@example.com', fullName: 'Cajero Turno Mañana', location: 'centro' },
  { email: 'cajero2@example.com', fullName: 'Cajero Turno Tarde', location: 'centro' },
  { email: 'mesero@example.com', fullName: 'Mesero Salón', location: 'providencia' },
  { email: 'staff@example.com', fullName: 'Staff General', location: 'providencia' },
];

async function createUser(email, metadata) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw new Error(`Error creating ${email}: ${error.message}`);
  return data.user;
}

async function check(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

async function main() {
  // Sin merchant_id en la metadata, handle_new_user crea Brand + Merchant + LoyaltyProgram +
  // membresía OWNER, todos con id = auth.users.id.
  console.log(`Creating owner ${OWNER.email}...`);
  const owner = await createUser(OWNER.email, { full_name: OWNER.fullName });
  const brandId = owner.id;

  await check(supabase.from('Brand').update({ name: BRAND.name }).eq('id', brandId));

  const [main, second] = LOCATIONS;
  await check(
    supabase
      .from('Merchant')
      .update({ name: main.name, slug: main.slug, commune: main.commune, region: main.region })
      .eq('id', brandId),
  );
  const [secondLocation] = await check(
    supabase
      .from('Merchant')
      .insert({ brandId, name: second.name, slug: second.slug, commune: second.commune, region: second.region })
      .select('id'),
  );
  const locationIds = { [main.key]: brandId, [second.key]: secondLocation.id };

  const [program] = await check(
    supabase
      .from('LoyaltyProgram')
      .update({ stampValidityDays: BRAND.stampValidityDays })
      .eq('brandId', brandId)
      .select('id'),
  );

  await check(
    supabase
      .from('Promotion')
      .insert(PROMOTIONS.map((p) => ({ ...p, programId: program.id, isActive: true }))),
  );
  console.log(
    `Brand "${BRAND.name}" with ${LOCATIONS.length} locations (${LOCATIONS.map((l) => `/join/${l.slug}`).join(', ')}) and ${PROMOTIONS.length} active promotions`,
  );

  // merchant_id en la metadata solo evita que el trigger les cree una marca propia. La
  // membresía STAFF se inserta acá con la service_role key, igual que hace StaffService.
  for (const staff of STAFF) {
    const merchantId = locationIds[staff.location];
    console.log(`Creating staff ${staff.email} at ${staff.location}...`);
    const user = await createUser(staff.email, { full_name: staff.fullName, merchant_id: merchantId });
    await check(
      supabase.from('BrandMember').insert({ userId: user.id, brandId, merchantId, role: 'STAFF' }),
    );
  }

  console.log(`Creating platform admin ${PLATFORM_ADMIN.email}...`);
  const admin = await createUser(PLATFORM_ADMIN.email, { full_name: PLATFORM_ADMIN.fullName, platform_admin: true });
  await check(supabase.from('PlatformAdmin').insert({ userId: admin.id, role: 'SUPERADMIN' }));

  const members = await check(supabase.from('BrandMember').select('userId, role').eq('brandId', brandId));
  console.log(`Brand ${brandId} has ${members.length} members.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
