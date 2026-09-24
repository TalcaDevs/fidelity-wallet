-- Migración: harden_signup_and_slug
-- Correcciones de la revisión del PR #11.
--
-- 1) ESCALADA DE PRIVILEGIOS (bloqueante). handle_new_user creaba la membresía a partir de
--    raw_user_meta_data.merchant_id / role. Ese campo lo escribe el propio cliente en
--    supabase.auth.signUp({ options: { data } }) con la anon key pública, así que cualquiera
--    podía registrarse como OWNER de cualquier local conociendo su id (que GET
--    /api/merchants/by-slug/:slug entrega a partir del QR de la mesa).
--    Ahora el trigger NO crea membresías desde metadata: un alta que trae merchant_id (una
--    invitación) no crea nada, y es StaffService —que ya verificó que quien invita es OWNER—
--    quien inserta la fila MerchantUser con rol STAFF usando la service_role key.
--
-- 2) SLUG NEUTRO. El slug por defecto salía del local-part del email del dueño
--    ("mi-local-juan-perez"): un dato personal impreso para siempre en los QR y adivinable.
--    Ahora es "local-<8 hex del id>", que además no colisiona nunca. El dueño lo cambia desde
--    PATCH /api/merchants/:merchantId/slug.
--
-- 3) slugify recortaba DESPUÉS del trim, y podía dejar un guion final ("aaa…a-").
--
-- 4) Los REVOKE ... FROM PUBLIC de la migración anterior no quitaban los EXECUTE que Supabase
--    concede explícitamente a anon/authenticated por ALTER DEFAULT PRIVILEGES.
--
-- 5) authenticated tenía UPDATE sobre toda la tabla Merchant: podía escribir slug directo por
--    PostgREST, saltándose slugify y la validación de unicidad del backend.

-- (3) slugify: recortar y LUEGO quitar guiones de los extremos.
CREATE OR REPLACE FUNCTION public.slugify(p_text text)
RETURNS text AS $$
  SELECT trim(BOTH '-' FROM left(
    regexp_replace(
      lower(translate(
        COALESCE(p_text, ''),
        'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'
      )),
      '[^a-z0-9]+', '-', 'g'
    ),
    60
  ));
$$ LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp;

-- (1) + (2) handle_new_user: sin membresías desde metadata y con slug neutro.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_name text;
BEGIN
  -- Alta con merchant_id en la metadata = invitación de personal. La metadata la controla el
  -- cliente, así que NO se usa para dar permisos: la membresía la crea el backend (StaffService)
  -- con la service_role key. Acá no se crea nada.
  IF NULLIF(new.raw_user_meta_data ->> 'merchant_id', '') IS NOT NULL THEN
    RETURN new;
  END IF;

  -- Dueño nuevo. Merchant.id = auth.users.id (se conserva por compatibilidad); lo que autoriza
  -- es la fila de membresía OWNER.
  v_name := 'Mi Local (' || split_part(new.email, '@', 1) || ')';

  INSERT INTO public."Merchant" (id, email, name, slug)
  VALUES (new.id, new.email, v_name, 'local-' || left(replace(new.id::text, '-', ''), 8));

  INSERT INTO public."MerchantUser" ("userId", "merchantId", "role")
  VALUES (new.id, new.id, 'OWNER'::"MerchantRole")
  ON CONFLICT ("userId", "merchantId") DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- (4) + (5) Privilegios mínimos. Se protege con IF por si la base no es Supabase.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.slugify(text) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.generate_merchant_slug(text, uuid) FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.slugify(text) FROM authenticated';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.generate_merchant_slug(text, uuid) FROM authenticated';

    -- El panel solo edita el nombre y la vigencia de los sellos. El slug lo cambia el backend.
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public."Merchant" FROM authenticated';
    EXECUTE 'GRANT UPDATE (name, "stampValidityDays") ON public."Merchant" TO authenticated';
  END IF;
END
$$;
