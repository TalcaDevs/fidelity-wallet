# Handoff — Fidelity Wallet

> Estado vigente del proyecto: qué es, cómo está armado, qué reglas no se rompen, qué falta y cómo levantarlo.
> **Lo ya hecho y su historia viven en los PR de GitHub** (#7 a #27); acá queda solo lo que sirve para trabajar hoy.
>
> Última actualización: **2026-10-04**, con el PR #27 (editor de la tarjeta), que depende del #26.
> La fuente de verdad de los contratos de la API es **Swagger** (`/api/docs`); la del modelo de datos, `apps/backend/prisma/schema.prisma`.

---

## 1. El producto

**Fricción cero para el cliente final:** sin app, sin contraseña, sin descarga. El cliente escanea un QR en la mesa, deja su teléfono o correo y en segundos tiene una tarjeta de fidelidad en Apple Wallet o Google Wallet, que se actualiza sola.

> **Regla de producto:** si una funcionalidad obliga al cliente final a instalar algo, registrarse con contraseña o abrir una app, va en contra del producto.

- **Modelo:** SaaS B2B2C. Se le cobra a la **marca**, por plan (prueba de 30 días, Inicial, Pro, Negocio; catálogo en `packages/shared/src/plans.ts`). El cobro real aún no existe.
- **El cajero puede matar el producto:** escanear tiene que tomar menos de ~2 s y tener respaldo manual. Velocidad y fallback son requisitos de negocio.

**Actores**

| Actor | Qué usa | Acceso |
|---|---|---|
| Cliente final | `/join/:slug` y su tarjeta en la billetera | Sin cuenta |
| Mesero (`STAFF`) | `/scan`, en el local asignado | Supabase Auth; solo su local |
| Dueño (`OWNER`) | Panel `/admin/*` y `/scan` en cualquier local de su marca | Supabase Auth; toda su marca |
| Equipo interno (`PlatformAdmin`) | `/internal/*` | `SUPPORT` lee y gestiona tickets; `SUPERADMIN` además edita marcas y ve datos completos con motivo |

---

## 2. Arquitectura

- **Monorepo pnpm** con dos apps y un paquete: `apps/backend` (NestJS 12 en ESM, Prisma 6, Vitest), `apps/frontend` (React 19, Vite, Tailwind 4, React Router 7) y `packages/shared` (`@fidelity/shared`, tipos y reglas compartidas; **se compila**).
- **Una sola app web** sirve la landing pública, el panel, el escáner (`/scan`) y el panel interno (`/internal/*`, con carga diferida).
- **Supabase**: PostgreSQL, Auth y Storage. RLS por membresía.
- **Lo nuevo va por el backend.** El panel todavía lee algunas tablas directo con supabase-js (dashboard, clientes); todo lo demás (escaneo, alta, tarjeta, equipo, reportes, soporte, sucursales, interno) va por `/api/*`.

**Rutas del frontend**

| Ruta | Qué es | Acceso |
|---|---|---|
| `/` · `/terminos` | Landing y términos | Público |
| `/join/:slug` | Alta del cliente final | Público |
| `/scan` | Escáner del cajero | `STAFF` u `OWNER` |
| `/admin/login` · `/admin/reset` | Login y recuperación | Público |
| `/admin/dashboard` · `analytics` · `customers` (+ `:customerId`) · `card` · `team` · `locations` · `support` · `settings` · `billing`* | Panel del dueño | Solo `OWNER` (un `STAFF` cae a `/scan`) |
| `/internal/*` | Panel interno | Solo `PlatformAdmin` |

\* `billing` es un mockup y solo existe con `VITE_FEATURE_BILLING=true`. `/admin/promotions` redirige a `/admin/card`.

---

## 3. Modelo de datos

> Glosario: **`Merchant` = local**. La tabla no se renombró para no romper RLS ni QR impresos. "Marca" = `Brand`.

| Modelo | Lo que importa |
|---|---|
| `Brand` | Marca. `status` (`ACTIVE` \| `SUSPENDED`), `planId`/`trialEndsAt` (asignados a mano desde `/internal`), `pointsEnabled`/`pesosPerPoint`. Para marcas registradas solas, `Brand.id` = id de su primer local |
| `Merchant` (local) | `brandId`, `slug` (público y **estable**: ya puede estar impreso en un QR), dirección, coordenadas, `isActive` |
| `BrandMember` | Membresía: `OWNER` sin local, `STAFF` con `merchantId`. **Es la fuente de los permisos** |
| `LoyaltyProgram` | **La tarjeta de la marca, una por marca** (`UNIQUE(brandId)`). `type` `STAMPS` \| `POINTS`; reglas (`welcomeBalance`, `dailyStampLimit`, `stampValidityDays`, vigencia de la tarjeta) y `design`/`details`/`registration` en JSONB, tipados en `packages/shared/src/card.ts`; `designVersion` sube con cada guardado |
| `Promotion` | Las **recompensas** de la tarjeta (`targetStamps` = costo en sellos o puntos). Varias activas a la vez |
| `Customer` | Global, compartido entre marcas. `phone?`, `email?`, `rut?` (únicos), `name?`, cumpleaños, aceptación de términos (`termsAcceptedAt`, `termsVersion`) |
| `Pass` | La tarjeta de un cliente: único por `(customerId, programId)`. `passToken` (32 bytes, es lo que va en el QR), `merchantId` = local de alta |
| `Stamp` | **El libro del saldo: una fila = un sello o un punto.** `expiresAt` se congela al ganarlo; `consumedAt` al canjear. Nunca hay un contador guardado |
| `Scan` | Historial append-only: `STAMP_ADDED` \| `REWARD_REDEEMED`, `method` (`QR` \| `MANUAL` \| `PANEL` \| `WELCOME`), quién lo hizo, `stampCount`, monto, nota |
| `ScanReceipt` | Foto de la boleta (bucket privado `purchase-receipts`), aparte de `Scan` para que el `STAFF` no la lea |
| `PassStampBalance` | Vista con el saldo calculado al leer (`security_invoker`, respeta el RLS) |
| `PlatformAdmin` · `AuditLog` | Equipo interno y auditoría append-only. Sin grants para `anon`/`authenticated` |
| `Ticket` · `TicketMessage` · `TicketAttachment` | Soporte. Contrato en `packages/shared/src/support.ts` |

**Convenciones:** tablas y columnas en PascalCase/camelCase entrecomilladas en SQL. UUID con `gen_random_uuid()`. Todo cambio de esquema va por migración Prisma.

---

## 4. Reglas que no se rompen

**Saldo y canje**
- El saldo **se calcula siempre al leer**: filas de `Stamp` no consumidas y no vencidas. Ningún cron corrige saldos.
- El saldo es **de la marca**: se gana en un local y se canjea en otro. Sirve para cualquier recompensa activa; el cliente elige en caja.
- El canje consume **FIFO** (los más antiguos primero) exactamente el costo de la recompensa elegida, dentro de una transacción con `SELECT … FOR UPDATE` sobre el `Pass`. Doble canje de la misma recompensa en 90 s = idempotente.
- Cambiar la vigencia **no es retroactivo**: `expiresAt` ya quedó fijado.

**Sumar en caja** (`POST /api/scan/validate` y luego `POST /api/scan`)
- Escanear solo **valida**: muestra al cliente (solo su primer nombre o un dato enmascarado) y devuelve un comprobante HMAC de 10 min. Se suma o canjea con ese comprobante.
- **Sellos:** el `STAFF` suma 1. Con `dailyStampLimit` (por defecto activado), un sello por día calendario de Chile; si no, la espera de `STAMP_COOLDOWN_MINUTES` (30). El `OWNER` puede sumar varios (`OWNER_MAX_STAMPS_PER_LOAD`) o saltarse la espera, siempre con motivo en `AuditLog`.
- **Puntos:** `floor(monto ÷ pesosPerPoint)`. El monto es obligatorio y **el `STAFF` debe adjuntar la foto de la boleta**. Solo se bloquea el doble envío de la misma compra (2 min). Tope de 10.000 por carga.
- Una tarjeta vencida (término fijo o plazo desde el alta) no suma ni canjea.
- Ingreso manual (RUT, teléfono o correo): máximo 10 búsquedas por minuto por usuario.
- El dueño también suma desde la ficha del cliente (`POST /api/customers/:id/stamps`, método `PANEL`, motivo obligatorio).

**Alta** (`POST /api/customers`)
- Exige teléfono **o** correo, aceptar los términos, y los datos que la tarjeta marque como requeridos. Ignora los que marque como "No pedir".
- Es atómica e idempotente. **Devuelve los links de la billetera solo la primera vez**: conocer el teléfono de otro no basta para robarle la tarjeta.
- Si el cliente ya existe, los datos enviados deben coincidir con los guardados; un dato faltante **no se completa** sin verificación.
- El saldo de bienvenida se registra como `Scan` `WELCOME` y no cuenta como visita en los reportes.

**Permisos y datos personales**
- **`raw_user_meta_data` nunca otorga permisos** (lo escribe el cliente en `signUp`). Las membresías las crea el backend con la `service_role key`, que nunca sale del backend.
- El permiso del `STAFF` se aplica en **RLS y en el backend**, no escondiendo botones.
- `/internal/*` solo lee desde `/api/internal/*` (guard `PlatformAdminGuard` + `@PlatformRoles`). **Nunca políticas RLS "para admins".** Cada escritura interna y cada vista de un dato completo quedan en `AuditLog`.
- Datos de clientes **enmascarados** en caja, reportes y panel interno. Borrado por Ley 19.628: `DELETE /api/customers/:id` (funciona aunque la marca esté suspendida).
- **Marca suspendida:** sin acceso al panel ni a `/scan`, `/join` responde "no disponible", los datos se conservan y las tarjetas en la billetera no se invalidan. La prueba vencida no suspende sola (queda `PAST_DUE`).
- **Límites del plan:** el backend bloquea crecer más allá (locales, meseros, clientes en la prueba) con 403 `PLAN_LIMIT`; lo que ya existe no se borra.
- Imágenes subidas: se validan por contenido y se **recodifican con sharp** (sin metadatos ni contenido oculto).
- Si cambian los términos, subir `TERMS_VERSION` en `apps/frontend/src/pages/public/Terms.tsx` **y** en `apps/backend/src/customers/terms.ts` en el mismo PR (hay un test que lo verifica).

**La tarjeta y Google Wallet** (editor en `/admin/card`, API `GET/PUT /api/brands/:brandId/card`)
- El editor y el backend comparten validadores puros de `@fidelity/shared`: `cardConfigProblems` devuelve mensajes; `cardConfigIssues` agrega el paso del editor donde corregirlos.
- No se puede cambiar entre sellos y puntos si algún cliente tiene saldo vigente. Los puntos se habilitan en Configuración (dueño) o en `/internal` (superadmin).
- La **clase** de Google lleva el diseño (nombres, también los `localized*`, logo, color, enlaces, secciones, plantilla del frente y `merchantLocations` para el aviso por cercanía). El **objeto** lleva el saldo, los textos y la tira de sellos como imagen destacada.
- La tira la dibuja el backend (`GET /api/public/cards/:programId/:version/strip/:target/:filled`) con la misma función que la vista previa. Las URLs llevan la versión del diseño, así que son inmutables.
- Las imágenes públicas están sujetas al `ThrottlerGuard` global. Solo se descargan assets del origen y carpeta de Storage de la marca, sin saltos de directorio ni redirecciones; el borrado también verifica la marca.
- Al guardar la tarjeta se publica la clase y se reenvían los pases; al cambiar la ubicación o el estado de un local se publica solo la clase. Dos publicaciones de la misma tarjeta no se superponen.
- **Google solo acepta imágenes HTTPS públicas.** Sin eso el pase se guarda igual, sin imágenes. `SUPABASE_PUBLIC_URL` publica las imágenes del Storage con otro origen.
- Sin credenciales de Google, con `ALLOW_MOCK_PASSES=true`, los pases son de prueba y la API de Google solo deja un log.

---

## 5. Pendientes

🔴 bloquea producción · 🟠 necesario para el piloto · 🟡 deuda · ⚪ opcional

**Producción y legal**
- 🔴 Deploy con HTTPS, llaves de producción y lugar seguro para los secretos; backups y monitoreo.
- 🔴 Términos: datos de la empresa (`VITE_LEGAL_*`), revisión de un abogado (incluida la Ley 21.719), saldo compartido entre locales y acceso de soporte a los datos.
- 🟠 En producción **no definir `GOOGLE_WALLET_CLASS_ID`**: con esa variable todas las marcas comparten una sola clase (y su diseño y ubicaciones).
- 🟠 Definir el cobro: moneda (USD o CLP), IVA, boleta y proveedor de pago.

**Billetera**
- 🟠 Invalidar el pase en Google (`state: INACTIVE`) al borrar un cliente o su pase.
- 🟠 Aviso de vencimiento del saldo por la billetera, unos 7 días antes.
- 🟠 Recuperar un pase perdido y verificación por OTP SMS.
- ⚪ Diferido: Apple Wallet real (Pass Type ID, `.p12`, WWDR, web service de PassKit y APNs) y la cámara en iOS Safari.
- ⚪ Pase web `/pase/:passToken` para quien no usa billetera.

**Caja y panel**
- 🟠 Anular un sello mal dado: solo el `OWNER`, con motivo y `AuditLog` (backend y UI).
- 🟡 Elegir el local en `/scan` cuando un `OWNER` tiene varios (hoy usa el más antiguo).
- 🟡 Probar en dispositivos reales: la sesión del cajero varias horas abierta en una tablet, y la elección de premio con 3 o más recompensas.
- ⚪ Mostrarle al cajero el próximo vencimiento del saldo (el backend ya devuelve `nextExpiryAt`).
- ⚪ Otros tipos de tarjeta: cashback, cupón, tarjeta de regalo y membresía (ver §6).

**Reportes**
- 🟡 Reporte por local y heatmap día × hora, exportar a Excel (`.xlsx`) e índices para las agregaciones.

**Calidad**
- 🟡 Tests: vencimiento y no-retroactividad contra la BD real, `slugify` y `generate_merchant_slug`, e2e reales (`test/app.e2e-spec.ts` sigue siendo el de ejemplo), y el DoD del panel interno (403 en todo `/api/internal/*` para quien no es admin, notas internas nunca visibles al dueño, `AuditLog` en cada escritura).
- 🟡 `ManualLookupLimiter` y la caché de imágenes de la tarjeta viven en memoria: con más de una instancia del backend, moverlos a un store compartido (Redis). `SCAN_VALIDATION_SECRET` debe ser la misma en todas las instancias.
- 🟡 Separar `ScanService` en `ScanLookupService` y `ScanRedeemService`, y pasar los estados de `Scan.tsx` a un reducer (propuesto en la revisión del PR #26, para después de mergear #26 y #27).
- 🟡 Crear los buckets de Storage en el provisionamiento del deploy; `ensureBucket` queda como red de seguridad.
- 🟡 Anonimizar los datos de marcas suspendidas por más de 2 años, **después** de la revisión legal.

---

## 6. Decisiones abiertas

- **Otros tipos de tarjeta:** cashback reutiliza el libro de `Stamp` igual que los puntos. Cupón y membresía necesitan entidades propias. La tarjeta de regalo es dinero prepagado: requiere cobro real y en Google usa `giftCardObject`. Orden sugerido: cashback, cupón, y lo demás cuando exista cobro.
- **Aviso por cercanía:** está integrado (`merchantLocations`), pero el radio y la frecuencia los decide Google y dependen de los permisos del celular. Validarlo en terreno antes de venderlo como funcionalidad del plan.
- **Límite diario por defecto:** quedó activado en todas las marcas. Confirmar con los primeros locales si prefieren la espera de 30 min.

Decisiones ya cerradas que conviene recordar: token del QR estático; saldo único por pase para varias recompensas; ciclo infinito tras el canje; solo el `OWNER` corrige sellos; los límites del plan se aplican al instante; los datos de una marca suspendida se anonimizan, no se retienen.

---

## 7. Puesta en marcha local

```bash
# Requisitos: Node 22+, pnpm 11, Docker Desktop corriendo
pnpm install
pnpm run dev                                    # Supabase local (API :54321, DB :54322, Studio :54323) + todas las apps

pnpm --filter @fidelity/shared build            # tras un pull que toque packages/shared (dev lo hace en watch)
pnpm --filter backend exec prisma generate      # tras un pull que toque schema.prisma
pnpm --filter backend exec prisma migrate deploy
```

**Resetear la base y cargar el seed** (borra todo, incluidos los usuarios de Auth):
```bash
npx supabase db reset
cd apps/backend && npx prisma migrate deploy && node --env-file=.env prisma/seed.js
```

**Variables** (copiar el `.env.example` de cada app; los `.env` no se versionan). Tras editar el `.env` del backend hay que reiniciarlo.
- **Backend:**
  - `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` y `BACKEND_URL` (raíz pública: desde ahí Google descarga las imágenes).
  - `ALLOW_MOCK_PASSES=true` para trabajar sin certificados; sin ella el alta responde 500.
  - `SCAN_VALIDATION_SECRET`: obligatoria en producción (sin ella el backend no arranca); en desarrollo se genera sola.
  - Opcionales: `STAMP_COOLDOWN_MINUTES` (`1` para probar rápido), `OWNER_MAX_STAMPS_PER_LOAD`, `SUPABASE_PUBLIC_URL`, `GEOCODING_CONTACT_EMAIL` y `SUPPORT_AUTOCLOSE_INTERVAL_MINUTES`.
  - Billeteras: `APPLE_*` y `GOOGLE_WALLET_*` (`GOOGLE_WALLET_CLASS_ID` solo en sandbox).
- **Frontend:**
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_API_URL` (en desarrollo, sin `VITE_API_URL` se usa el proxy de Vite).
  - Mockups y contacto: `VITE_FEATURE_BILLING`, `VITE_SUPPORT_EMAIL` y `VITE_SUPPORT_WHATSAPP`.
  - Antes de producción: `VITE_LEGAL_*`.

**Cuentas del seed** (contraseña `password123`):

| Marca | Situación | `/join/…` | `OWNER` | `STAFF` |
|---|---|---|---|---|
| Café Demo | Pro, sellos, 3 locales | `cafe-demo`, `cafe-demo-providencia`, `cafe-demo-nunoa` | `owner@example.com` | `cajero1`, `cajero2`, `mesero`, `staff`, `barista` (`@example.com`) |
| Heladería Sur | Prueba por vencer, en el límite del plan | `heladeria-sur` | `heladeria@example.com` | `heladeria.caja@example.com` |
| Panadería Norte | Suspendida | `panaderia-norte`, `panaderia-norte-serena` | `panaderia@example.com` | `panaderia.caja@example.com` |
| Librería Puntos | Prueba, **tarjeta de puntos y sin clientes** | `libreria-puntos` | `libreria@example.com` | `libreria.caja@example.com` |

`admin@example.com` es `SUPERADMIN` de `/internal`. Los admins de producción se crean directo en la BD (usuario de Auth + fila en `PlatformAdmin`), nunca desde la UI.

**Probar el flujo:** registrarse en `/join/<slug>` en incógnito, entrar como cajero en `/scan`, sumar por QR o por ingreso manual hasta el premio y canjear. En modo mock el QR del cliente está en el link de Apple (`/api/passes/<passToken>/apple`); se convierte en imagen con `npx qrcode -o pase.png <passToken>`.

**Probar en el celular o con Google Wallet real:**
- **Celular en la misma red:** `pnpm --filter frontend dev:lan`.
- **HTTPS público** (cámara fuera de `localhost` e imágenes del pase): `cloudflared tunnel --url http://localhost:5173`. Vite acepta `*.trycloudflare.com`. Pon la URL del túnel en `BACKEND_URL` y `SUPABASE_PUBLIC_URL` y reinicia el backend.

**Tests:** `pnpm -r run test`. Contra la BD real (RLS, triggers, `handle_new_user`): `pnpm --filter backend run test:db`, con Supabase levantado; cada test se revierte.

**Problema conocido:** si subir una imagen falla con `42P10`, la imagen de `storage-api` es más vieja que el esquema. Se corrige con `printf v1.77.0 > supabase/.temp/storage-version` y luego `npx supabase stop && npx supabase start`.

---

## 8. Cómo trabajamos

- **Ramas:** `main` ← `dev` ← `feature/<nombre>`. Los PR van contra `dev`; si uno depende de otro, se indica al inicio del PR.
- **Antes de abrir un PR:** `pnpm -r run lint && pnpm -r run typecheck && pnpm -r run test && pnpm -r run build`. La CI corre eso más audit y los tests de BD; **un PR con CI rojo no se revisa**.
- **Esquema:** siempre por migración Prisma, nunca SQL suelto, y avisando en el PR.
- **Contratos:** Swagger para la API. Lo que cruzan frontend y backend se tipa una sola vez en `packages/shared`, junto con las reglas que deben coincidir en ambos lados (ej. `cardConfigProblems`).
- **Comentarios:** solo el porqué no obvio (reglas de negocio, seguridad, workarounds); no narrar lo que el código ya dice.
- Quien cambia una regla o un pendiente de este documento lo actualiza **en el mismo PR**.
