-- Migración: least_privilege_grants
-- Aplica el principio de mínimo privilegio sobre los roles de Supabase (anon, authenticated, service_role).
-- Mantiene cerrado el acceso directo a passToken para el rol authenticated (column-level grant).

DO $$
BEGIN
  -- Permisos para el rol anon (landing pública y clientes sin autenticar)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO anon';
    EXECUTE 'GRANT SELECT ON public."Merchant", public."Promotion" TO anon';
  END IF;

  -- Permisos para el rol authenticated (dueños y meseros con sesión en panel/PWA)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO authenticated';
    EXECUTE 'GRANT SELECT ON public."Merchant", public."Promotion", public."Customer", public."Stamp", public."Scan", public."MerchantUser", public."PassStampBalance" TO authenticated';

    -- En Pass, asegurar revocación explícita de SELECT previo y otorgar SELECT solo a columnas seguras (excluyendo passToken)
    EXECUTE 'REVOKE SELECT ON public."Pass" FROM anon, authenticated';
    EXECUTE 'GRANT SELECT (id, "customerId", "merchantId", "createdAt", "updatedAt") ON public."Pass" TO authenticated';

    EXECUTE 'GRANT INSERT, UPDATE, DELETE ON public."Promotion", public."MerchantUser" TO authenticated';

    -- Conceder ejecución únicamente sobre las funciones auxiliares de evaluación RLS
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_merchant_ids() TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_merchant_owner(uuid) TO authenticated';
  END IF;

  -- Permisos para service_role (backend NestJS exclusivo)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO service_role';
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role';
    EXECUTE 'GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role';
  END IF;
END
$$;
