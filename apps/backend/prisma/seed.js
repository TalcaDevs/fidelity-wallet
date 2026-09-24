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

const MERCHANT = { name: 'Café Demo', slug: 'cafe-demo', stampValidityDays: 30 };

const PROMOTIONS = [
  { name: 'Café', targetStamps: 5, rewardName: 'Café gratis' },
  { name: 'Almuerzo', targetStamps: 10, rewardName: 'Almuerzo gratis' },
];

const STAFF = [
  { email: 'cajero1@example.com', fullName: 'Cajero Turno Mañana' },
  { email: 'cajero2@example.com', fullName: 'Cajero Turno Tarde' },
  { email: 'mesero@example.com', fullName: 'Mesero Salón' },
  { email: 'staff@example.com', fullName: 'Staff General' },
];

async function createUser(email, metadata) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: metadata
  });
  if (error) throw new Error(`Error creating ${email}: ${error.message}`);
  return data.user;
}

async function main() {
  // Sin merchant_id en la metadata, el trigger handle_new_user crea el Merchant
  // (id = auth.users.id, slug neutro "local-xxxxxxxx") y la membresia OWNER.
  console.log(`Creating owner ${OWNER.email}...`);
  const owner = await createUser(OWNER.email, { full_name: OWNER.fullName });
  const merchantId = owner.id;
  console.log("Owner created, Merchant ID:", merchantId);

  // Nombre y slug fijos para que la demo tenga una URL conocida: /join/cafe-demo
  const { error: merchantError } = await supabase
    .from('Merchant')
    .update({ name: MERCHANT.name, slug: MERCHANT.slug, stampValidityDays: MERCHANT.stampValidityDays })
    .eq('id', merchantId);
  if (merchantError) throw merchantError;

  // Dos promociones activas: los sellos son un saldo unico y el cliente elige cual canjear.
  const { error: promoError } = await supabase
    .from('Promotion')
    .insert(PROMOTIONS.map((p) => ({ ...p, merchantId, isActive: true })));
  if (promoError) throw promoError;
  console.log(`Merchant "${MERCHANT.name}" -> /join/${MERCHANT.slug} with ${PROMOTIONS.length} active promotions`);

  // merchant_id en la metadata solo evita que el trigger les cree un local propio. La
  // metadata NO da permisos (la escribe el cliente): la membresia STAFF se inserta aca con
  // la service_role key, igual que hace StaffService.
  for (const staff of STAFF) {
    console.log(`Creating staff ${staff.email}...`);
    const user = await createUser(staff.email, {
      full_name: staff.fullName,
      merchant_id: merchantId
    });
    const { error: memberError } = await supabase
      .from('MerchantUser')
      .insert({ userId: user.id, merchantId, role: 'STAFF' });
    if (memberError) throw memberError;
    console.log("Staff created:", user.id);
  }

  const { data: members, error } = await supabase
    .from('MerchantUser')
    .select('userId, role')
    .eq('merchantId', merchantId);
  if (error) throw error;
  console.log(`Merchant ${merchantId} has ${members.length} members.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
