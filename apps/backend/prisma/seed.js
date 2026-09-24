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
  // (id = auth.users.id) y la membresia OWNER.
  console.log(`Creating owner ${OWNER.email}...`);
  const owner = await createUser(OWNER.email, { full_name: OWNER.fullName });
  const merchantId = owner.id;
  console.log("Owner created, Merchant ID:", merchantId);

  // Con merchant_id + role en la metadata, el trigger solo inserta la membresia STAFF
  // en ese local (no le crea un Merchant propio).
  for (const staff of STAFF) {
    console.log(`Creating staff ${staff.email}...`);
    const user = await createUser(staff.email, {
      full_name: staff.fullName,
      merchant_id: merchantId,
      role: 'STAFF'
    });
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
