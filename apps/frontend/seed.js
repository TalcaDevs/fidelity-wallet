import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_secret_key";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log("Creating owner...");
  const { data: ownerData, error: ownerError } = await supabase.auth.admin.createUser({
    email: 'owner@example.com',
    password: 'password123',
    email_confirm: true
  });
  
  if (ownerError) {
    console.error("Error creating owner:", ownerError);
    return;
  }
  console.log("Owner created:", ownerData.user.id);
  
  // Wait a bit for trigger to create Merchant
  await new Promise(r => setTimeout(r, 1000));
  
  // Fetch the Merchant ID created by the trigger
  const { data: merchantData, error: merchantError } = await supabase
    .from('MerchantUser')
    .select('merchantId')
    .eq('userId', ownerData.user.id)
    .single();
    
  if (merchantError || !merchantData) {
    console.error("Error fetching merchant:", merchantError);
    return;
  }
  const merchantId = merchantData.merchantId;
  console.log("Merchant ID:", merchantId);

  console.log("Creating staff...");
  const { data: staffData, error: staffError } = await supabase.auth.admin.createUser({
    email: 'staff@example.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      merchant_id: merchantId,
      role: 'STAFF'
    }
  });
  if (staffError) console.error("Error creating staff:", staffError);
  else console.log("Staff created:", staffData.user.id);

  console.log("Creating jere...");
  const { data: jereData, error: jereError } = await supabase.auth.admin.createUser({
    email: 'jere@gmail.com',
    password: '200231',
    email_confirm: true,
    user_metadata: {
      merchant_id: merchantId,
      role: 'STAFF'
    }
  });
  if (jereError) console.error("Error creating jere:", jereError);
  else console.log("Jere created:", jereData.user.id);
}

main().catch(console.error);
