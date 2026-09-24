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
    email_confirm: true
  });
  if (staffError) {
    console.error("Error creating staff:", staffError);
    return;
  }
  console.log("Staff created:", staffData.user.id);

  console.log("Assigning staff to MerchantUser...");
  const { error: insertError } = await supabase.from('MerchantUser').insert({
    userId: staffData.user.id,
    merchantId: merchantId,
    role: 'STAFF'
  });

  if (insertError) {
    console.error("Error assigning staff to merchant:", insertError);
  } else {
    console.log("Staff assigned to merchant successfully.");
  }
}

main().catch(console.error);
