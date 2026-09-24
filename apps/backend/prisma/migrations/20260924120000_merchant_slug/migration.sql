-- Migración: merchant_slug
-- Agrega Merchant.slug, el identificador público que va en la landing /join/:merchantName.
-- La URL pública usa el slug; toda escritura (alta de cliente, emisión de pase) sigue usando
-- el merchantId (UUID). El slug es estable: renombrar el local NO lo cambia, porque ya puede
-- estar impreso en los QR de las mesas.

-- 1. Normaliza un texto a slug: minúsculas, sin tildes, solo [a-z0-9] separados por guiones.
--    Se usa translate() porque la extensión unaccent no está habilitada en el proyecto.
CREATE OR REPLACE FUNCTION public.slugify(p_text text)
RETURNS text AS $$
  SELECT left(
    trim(BOTH '-' FROM regexp_replace(
      lower(translate(
        COALESCE(p_text, ''),
        'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'
      )),
      '[^a-z0-9]+', '-', 'g'
    )),
    60
  );
$$ LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp;

-- 2. Slug único para un comercio: si "cafe-central" ya existe, prueba "cafe-central-2", "-3"...
CREATE OR REPLACE FUNCTION public.generate_merchant_slug(p_name text, p_merchant_id uuid)
RETURNS text AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix int := 1;
BEGIN
  v_base := public.slugify(p_name);
  IF v_base = '' THEN
    v_base := 'local';
  END IF;

  v_candidate := v_base;
  WHILE EXISTS (
    SELECT 1 FROM public."Merchant" WHERE slug = v_candidate AND id <> p_merchant_id
  ) LOOP
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix;
  END LOOP;

  RETURN v_candidate;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- Mínimo privilegio: son funciones internas del trigger, no se exponen a anon/authenticated.
REVOKE ALL ON FUNCTION public.slugify(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_merchant_slug(text, uuid) FROM PUBLIC;

-- 3. Columna + backfill de los comercios existentes (en orden de alta, para que el más antiguo
--    se quede con el slug sin sufijo).
ALTER TABLE public."Merchant" ADD COLUMN "slug" TEXT;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id, name FROM public."Merchant" ORDER BY "createdAt", id LOOP
    UPDATE public."Merchant"
    SET slug = public.generate_merchant_slug(r.name, r.id)
    WHERE id = r.id;
  END LOOP;
END
$$;

ALTER TABLE public."Merchant" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Merchant_slug_key" ON public."Merchant"("slug");

-- 4. El alta de dueños genera el slug. Mismo cuerpo que 20260921020000_merchant_users_and_roles
--    más la columna slug.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_merchant_id uuid;
  v_role "MerchantRole";
  v_name text;
BEGIN
  v_merchant_id := NULLIF(new.raw_user_meta_data ->> 'merchant_id', '')::uuid;

  IF v_merchant_id IS NOT NULL THEN
    -- Mesero invitado. El rol viene en la metadata, pero NO se castea a ciegas: un valor
    -- basura ahi haria fallar el alta entera con un error de enum. Cualquier cosa que no
    -- sea OWNER cae a STAFF, que es el rol menos privilegiado.
    v_role := (CASE upper(COALESCE(NULLIF(new.raw_user_meta_data ->> 'role', ''), 'STAFF'))
                 WHEN 'OWNER' THEN 'OWNER'
                 ELSE 'STAFF'
               END)::"MerchantRole";

    INSERT INTO public."MerchantUser" ("userId", "merchantId", "role")
    VALUES (new.id, v_merchant_id, v_role)
    ON CONFLICT ("userId", "merchantId") DO NOTHING;
  ELSE
    -- Dueno nuevo. Se conserva que Merchant.id = auth.users.id para no invalidar los datos
    -- existentes, pero eso ya no es lo que autoriza nada: autoriza la fila de membresia.
    v_name := 'Mi Local (' || split_part(new.email, '@', 1) || ')';

    INSERT INTO public."Merchant" (id, email, name, slug)
    VALUES (new.id, new.email, v_name, public.generate_merchant_slug(v_name, new.id));

    INSERT INTO public."MerchantUser" ("userId", "merchantId", "role")
    VALUES (new.id, new.id, 'OWNER'::"MerchantRole")
    ON CONFLICT ("userId", "merchantId") DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
