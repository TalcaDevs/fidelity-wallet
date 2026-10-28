-- Migración: signup_business_name
-- Permite que el dueño especifique el nombre de su negocio o tienda al registrarse en el formulario.
-- Si el campo no se completa (registro rápido para explorar la plataforma), se usa 'Mi Comercio' como valor por defecto.
-- raw_user_meta_data nunca decide roles ni permisos (mantiene intactas las reglas de seguridad).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_name text;
  v_raw_business_name text;
BEGIN
  -- Invitación de personal: la membresía la crea StaffService.
  IF NULLIF(new.raw_user_meta_data ->> 'merchant_id', '') IS NOT NULL THEN
    RETURN new;
  END IF;

  -- Admin interno: no recibe marca. Como la metadata la escribe el cliente, esto solo evita
  -- crear la marca y no otorga nada: los permisos salen de la tabla PlatformAdmin.
  IF new.raw_user_meta_data ->> 'platform_admin' = 'true' THEN
    RETURN new;
  END IF;

  -- Si el usuario ingresó un nombre de negocio o tienda al registrarse, se usa sanitizado.
  -- Si no se especificó (o viene solo con espacios), se recurre al valor amigable por defecto.
  v_raw_business_name := trim(new.raw_user_meta_data ->> 'business_name');
  IF v_raw_business_name IS NOT NULL AND length(v_raw_business_name) > 0 THEN
    v_name := substring(v_raw_business_name from 1 for 80);
  ELSE
    v_name := 'Mi Comercio';
  END IF;

  INSERT INTO public."Brand" (id, name, "contactEmail")
  VALUES (new.id, v_name, new.email);

  INSERT INTO public."Merchant" (id, "brandId", email, name, slug)
  VALUES (new.id, new.id, new.email, v_name, 'local-' || left(replace(new.id::text, '-', ''), 12));

  INSERT INTO public."LoyaltyProgram" ("brandId", name)
  VALUES (new.id, 'Tarjeta de sellos');

  INSERT INTO public."BrandMember" ("userId", "brandId", "role")
  VALUES (new.id, new.id, 'OWNER'::"MerchantRole")
  ON CONFLICT ("userId", "brandId") DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
