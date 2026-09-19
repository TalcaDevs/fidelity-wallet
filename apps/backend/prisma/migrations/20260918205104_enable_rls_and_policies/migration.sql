DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        CREATE SCHEMA auth;
        EXECUTE 'CREATE FUNCTION auth.uid() RETURNS uuid AS ''SELECT gen_random_uuid();'' LANGUAGE SQL;';
    END IF;
END $$;

ALTER TABLE "Merchant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Promotion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scan" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant_RLS" ON "Merchant" FOR ALL USING (id = auth.uid());
CREATE POLICY "Promotion_RLS" ON "Promotion" FOR ALL USING ("merchantId" = auth.uid());
CREATE POLICY "Pass_RLS" ON "Pass" FOR ALL USING ("merchantId" = auth.uid());
CREATE POLICY "Scan_RLS" ON "Scan" FOR ALL USING ("merchantId" = auth.uid());
CREATE POLICY "Customer_RLS" ON "Customer" FOR ALL USING (true);
