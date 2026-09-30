# Handoff — Fidelity Wallet

> Documento de traspaso del equipo. Desde el **2026-09-30** el trabajo se reparte así:
> - **Dev 1 — Backend, motor de pases y reportería/analítica del dueño** (§5, §5.8).
> - **Dev 2 — PWA del cajero, landing del cliente, Equipo y mockups de Facturación y Soporte** (§6, §6.4–§6.6).
> - **Dev 3 — Infra, base de datos, migración Brand > Location y panel interno `/internal/*`** (§11).
>
> Última actualización: **2026-09-30** · Rama de referencia: `dev` (incluye los PR #12 y #13).

> **¿Llegas nuevo o vuelves después de unos días?** Empieza por el **§0.1** (qué cambió el 2026-09-30) y luego por el **§3: checklist de lo hecho y lo que falta por dev**. Las secciones 1–2 explican el porqué; el §3 dice en qué estamos. La sección de Dev 3 quedó al final (§11) para no renumerar las referencias que ya existen.

---

## 0. Cambios de arquitectura — leer esto primero

### 0.1 Cambios del 2026-09-30

Cinco decisiones nuevas. **La 5 es la más cara desde la decisión 4:** reabre el multi-local, que el §8.4 dejaba fuera del MVP.

| # | Decisión | Qué queda **sin efecto** | Dónde impacta |
|---|---|---|---|
| 5 | **Multi-local: `Brand > Location`**. Una marca tiene N locales. El **saldo de sellos es de la marca**: se sella en el local A y se canjea en el B. Promociones y vigencia viven en la marca. El `Merchant` de hoy pasa a ser una `Location` | §8.4 ("multi-local sigue fuera") y §1.6 | §1.6, §4, §5.4, §8.4, §11 — **los tres** |
| 6 | **`LoyaltyProgram` desde ya.** Cada marca tiene programas de lealtad. Hoy solo existe el tipo `STAMPS`, con `scope = BRAND`. **`Pass` pasa a ser único por `(customerId, programId)`**, no por comercio: cada programa es una tarjeta distinta en la billetera. Puntos, cashback, cupones, giftcard y membresía quedan **diseñados pero no construidos** (§8.10) | `Pass @@unique([customerId, merchantId])` y `Merchant.stampValidityDays` | §4, §5, §8.10, §11.2 |
| 7 | **Roles: `OWNER` a nivel de marca, `STAFF` a nivel de local.** El dueño administra todos sus locales; el mesero escanea solo en el local al que está asignado | El `MerchantUser` actual (un comercio, sin local) | §1.5, §6.4, §11.2 |
| 8 | **Panel interno de la plataforma en `/internal/*`, dentro de `apps/frontend`.** Los admins internos se identifican por la tabla `PlatformAdmin` (`SUPERADMIN` \| `SUPPORT`), nunca por metadata. **Todos los datos entre comercios salen de `/api/internal/*` en el backend**, no de supabase-js | — | §2, §7.10, §11 |
| 9 | **La reportería del dueño se sirve desde el backend** (`/api/brands/:brandId/reports/*`), no con consultas directas a Supabase. El dashboard actual queda como está hasta que se migre | — | §5.8 |

Reparto de tareas del 2026-09-30:
- **Dev 1** pasa a reportería y analítica del `OWNER` (§5.8). La base de emisión de Google Wallet ya entró (PR #13). Apple, el push y la personalización del pase quedan en su lista, **detrás** de la reportería (§3.2).
- **Dev 2** toma Equipo (UI **y** backend del módulo `staff`), el mockup de Facturación y el mockup de Soporte (§6.4–§6.6), además de lo que le quedaba del escáner.
- **Dev 3** hace **primero** la migración `Brand > Location` + `LoyaltyProgram` (bloquea a los otros dos) y después el panel interno, con el contrato de tickets que consume Dev 2 (§11).
- Lo que el Dev 3 anterior tenía abierto en el panel del dueño se reasigna: **métricas por promoción → Dev 1** (entra en la reportería); **QR imprimible y texto de promociones → Dev 2**; **llaves de producción y despliegue → Dev 3**.

### 0.2 Cambios del 2026-09-20

Si ya leíste este documento antes de esa fecha, estas cuatro decisiones de equipo cambian cosas que el texto anterior **afirmaba al revés**. Ya están aplicadas en el resto del documento; esta tabla es el resumen de un vistazo.

| # | Decisión | Qué queda **sin efecto** | Dónde impacta |
|---|---|---|---|
| 1 | **Los sellos vencen**, con expiración **FIFO por sello**: un sello deja de ser un contador y pasa a ser una fila de la tabla `Stamp`. `Pass.stampsCount` **se eliminó** | El incremento atómico de `stampsCount` (§5.4 vieja) y el reset a 0 post-canje | §4, §5.4, §7.7, §8.3 — **Dev 1 fuerte** |
| 2 | **La landing pública y el panel se separan por ruta**: `/` es una landing estática pública y el panel vive bajo `/admin/*` | `path="*"` → login: el dominio entero era una pantalla de contraseña | §2, §6 — Dev 2 y Dev 3 |
| 3 | **El scanner vive DENTRO de `apps/frontend`, en la ruta `/scan`** | **`apps/scanner` no se crea.** Toda mención previa a esa app queda anulada | §3, §6.1, §10 — **Dev 2** |
| 4 | **Dos roles reales: `OWNER` y `STAFF` (mesero)**, con tabla `MerchantUser` y RLS por membresía | §1.5 ("el cajero no tiene cuenta", "el dueño es el único con login") y §8.4 (roles fuera del MVP) | §1.5, §1.6, §2, §4, §5.6, §6.1, §7.1, §7.8, §8.4 — **los tres** |

Los tres cambios que más rompen supuestos previos:

- **Ya no existe `Pass.stampsCount`.** Cualquier código o query que lo lea se rompe. El saldo se lee de la vista `PassStampBalance`.
- **La PWA del cajero ya no es una pantalla sin login.** El mesero se autentica con Supabase Auth. Dev 2: esto agrega manejo de sesión, refresh de token y expiración a una pantalla que vive abierta todo un turno.
- **`merchantId = auth.uid()` dejó de ser cierto.** Con más de un usuario por comercio, los permisos salen de la membresía (`MerchantUser`), no de la igualdad de UUIDs.
- **La vigencia de los sellos se configura por comercio, no por promoción.** Nació en `Promotion` y se movió a `Merchant.stampValidityDays` (refundida dentro de `20260921010000_stamps_with_expiry`, 2026-09-21): es una regla del local ("acá los sellos valen 3 meses"), el dueño la fija una sola vez en Configuración junto al nombre del negocio, y el escaneo ya no necesita resolver antes qué promoción aplica para saber cuánto dura el sello.

---

## 1. ¿Qué estamos construyendo y por qué?

### 1.1 El problema
Los programas de fidelización en cafeterías, barberías, restaurantes y retail pequeño siguen funcionando con **tarjetas de cartón y timbres**. Eso implica: tarjetas que se pierden, fraude por timbres falsificados, cero datos para el dueño del local y ninguna forma de reactivar a un cliente que dejó de venir. Las alternativas digitales existentes obligan a **instalar una app**, y ahí se pierde la gran mayoría de los clientes: nadie descarga una app para un café gratis.

### 1.2 Nuestra apuesta (la tesis del producto)
**Fricción cero: cero apps, cero contraseñas, cero descargas para el cliente final.**

Usamos la billetera que el cliente **ya tiene instalada** en su teléfono — Apple Wallet y Google Wallet — como canal de entrega. El cliente escanea un QR en la mesa, entrega su RUT o teléfono, y en segundos tiene una tarjeta de fidelidad viva en su billetera. A partir de ahí:

- La tarjeta **se actualiza sola** (push vía APNs / Google Wallet API); el cliente no abre nada.
- La tarjeta **notifica** ("¡Ganaste un sello!", "¡Premio desbloqueado!") sin que exista una app nuestra en su teléfono.
- La tarjeta **no se pierde ni se falsifica**: el pase está firmado criptográficamente.

Ese es el diferenciador que hay que proteger en cada decisión técnica. **Si una funcionalidad obliga al cliente final a instalar algo, registrarse con contraseña o abrir una app, va en contra del producto.**

> Ojo con el matiz que trajo la decisión 4: *cero contraseñas* sigue siendo intocable **para el cliente final**. El cajero sí tiene cuenta desde hoy — es personal del local, no un cliente.

### 1.3 Modelo de negocio
SaaS **B2B2C**: le cobramos al **comercio**, no al cliente final. *(Actualizado 2026-09-30: ya no se cobra "por local" sino **por plan y por marca**, con límites de programas, sucursales y usuarios. Hay 4 planes: prueba gratis de 30 días, Inicial, Pro y Negocio; ver §6.5. Es un mockup: los precios no están cerrados, §8.11.)* De ahí se desprende:

- El cliente que paga y al que hay que enamorar es el **dueño del local**. Lo que compra son: clientes que vuelven, base de datos propia y métricas.
- El **cliente final** es el usuario cuyo costo de adopción debe ser cero.
- El **cajero** es quien puede matar el producto: si escanear demora más de ~2 segundos o falla seguido, el local deja de usarlo y cancela. **La velocidad y el fallback del escaneo son requisitos de negocio, no detalles de UX.**

### 1.4 Métricas de éxito (qué significa "esto funciona")
| Métrica | Meta | De quién depende |
|---|---|---|
| Tiempo de emisión del pase (QR → tarjeta en la billetera) | < 15 s | Dev 1 + Dev 2 |
| Tiempo de escaneo en caja (cámara → confirmación en pantalla) | < 2 s | Dev 2 |
| Conversión del landing `/join/:merchantName` | > 60% | Dev 2 |
| Entrega del push "premio desbloqueado" | < 10 s tras el sello | Dev 1 |
| Uso semanal del panel por el dueño | ≥ 1 sesión/semana | Dev 1 (reportería, §5.8) + Dev 2 |

### 1.5 Los actores y lo que ve cada uno
*(Actualizado 2026-09-20 — decisión 4. Antes decía que el cajero no tenía cuenta y que el dueño era el único con login. Ya no es así.)*

1. **Cliente final** — solo ve el landing de emisión y su tarjeta en la billetera. Nunca ve nuestra marca como app. **Sigue sin cuenta, sin contraseña y sin descarga.**
2. **Cajero / mesero (`STAFF`)** — **tiene cuenta propia de Supabase Auth desde hoy.** Ve la PWA de escaneo en `/scan`: cámara, confirmación y fallback por RUT/teléfono. Interfaz de un botón, usable con una mano y sin capacitación. Permisos: **solo lectura** del saldo de sellos de los clientes + el scanner. Si entra a `/admin/*` se lo redirige a `/scan`.
3. **Dueño del local (`OWNER`)** — ve el panel admin web bajo `/admin/*`: configura promociones (incluida la vigencia de los sellos), invita meseros y revisa métricas. Acceso completo de lectura y escritura. **Desde el 2026-09-30 (decisión 7) es dueño de la marca: ve y configura todos sus locales.**
4. **Admin interno de la plataforma (`PlatformAdmin`)** — *(nuevo 2026-09-30, decisión 8)*. Somos nosotros. Ve `/internal/*`: todas las marcas y locales, su ubicación y contacto, y los tickets de soporte. `SUPPORT` lee y gestiona tickets; `SUPERADMIN` además edita la configuración de marcas y locales y puede ver datos de clientes sin enmascarar, dejando registro (§11). **No tiene membresía en ningún comercio**: su acceso pasa por el backend, no por el RLS.

La relación usuario↔comercio↔rol vive hoy en la tabla `MerchantUser`. Un comercio tiene **un `OWNER` y N `STAFF`**. Con la decisión 7 la membresía pasa a ser por marca, con un `locationId` para el `STAFF` (§11.2).

### 1.6 Alcance del MVP (y lo que queda fuera, a propósito)
**Dentro:**
- Un comercio = un panel = una caja física, pero con **varios usuarios**: 1 `OWNER` + N `STAFF` (actualizado 2026-09-20).
- Promociones por sellos acumulados (`compra N, lleva 1`).
- **Sellos con vencimiento configurable** por comercio (`Merchant.stampValidityDays`), con consumo FIFO (actualizado 2026-09-20; el parámetro nació en `Promotion` y se movió a `Merchant` el mismo día).
- Emisión de pase Apple + Google, sellado y canje, con push de actualización.
- Panel con métricas básicas y CRUD de promociones.
- **Landing pública en `/`** separada del panel (actualizado 2026-09-20).
- **Multi-local `Brand > Location`** con saldo de sellos compartido por la marca (decisión 5, 2026-09-30).
- **`LoyaltyProgram` como capa del modelo**, pero solo con el tipo `STAMPS` (decisión 6).
- **Panel interno `/internal/*`** con tickets de soporte (decisión 8).
- **Reportería del dueño** servida por el backend (decisión 9).
- **Mockups** de Facturación y Soporte en el panel del dueño (§6.5, §6.6): pantallas con datos simulados, sin cobro real.

**Fuera del MVP (no construirlo aunque sea tentador):**
- ~~Multi-local / franquicias con jerarquía `Brand > Location`~~ — **entró el 2026-09-30** (decisión 5). Lo que sigue afuera es que cada marca elija saldo por local (`LoyaltyProgram.scope = LOCATION`): el campo existe, pero no se implementa.
- Programas que no sean sellos: puntos, cashback, cupones, giftcard y membresía (§8.10). Tampoco niveles/tiers.
- Cobro real: proveedor de pago, boletas y aplicación de los límites del plan (§8.11).
- Impersonar a un `OWNER` desde el panel interno.
- Integración con POS o boleta electrónica.
- App nativa de cualquier tipo.
- Campañas de marketing salientes (email/SMS/push promocional).
- Un cron que "corrija" saldos vencidos: el saldo se calcula al leer, no se corrige (ver §5.4).

---

## 2. Arquitectura y decisiones ya tomadas

```
┌──────────────────────────────────┐
│  Cliente final (iOS / Android)   │  Apple Wallet / Google Wallet — pase firmado
└──────────────┬───────────────────┘
               │ muestra QR (passToken)
┌──────────────▼───────────────────┐
│  PWA del cajero  (Dev 2)         │  apps/frontend → ruta /scan · requiere sesión STAFF/OWNER
└──────────────┬───────────────────┘
               │ POST /api/scan
┌──────────────▼───────────────────┐
│  API NestJS  (Dev 1)             │  reglas de negocio + motor de pases
│   ├── passkit-generator (.pkpass)│
│   ├── jsonwebtoken (JWT Wallet)  │
│   └── APNs / Google Wallet API   │  push de actualización
└──────────────┬───────────────────┘
               │ Prisma
┌──────────────▼───────────────────┐
│  Supabase (PostgreSQL + Auth)    │  única fuente de verdad · RLS por membresía
└──────────────▲───────────────────┘
               │ supabase-js (anon key, acceso directo hoy)
┌──────────────┴───────────────────┐
│  Panel del dueño React/Vite      │  apps/frontend → rutas /admin/*
└──────────────────────────────────┘   reportería (Dev 1) · equipo, facturación, soporte (Dev 2)

┌──────────────────────────────────┐
│  Panel interno (Dev 3)           │  apps/frontend → rutas /internal/* · solo PlatformAdmin
└──────────────┬───────────────────┘   carga diferida (React.lazy): no va en el bundle principal
               │ /api/internal/*  (nunca supabase-js directo: el RLS no cubre acceso entre marcas)
               ▼
          API NestJS
```

**Decisiones vigentes:**
- **Monorepo pnpm** (`apps/*`, `packages/*`). Node 22+, pnpm 11. **Solo hay dos apps: `apps/backend` y `apps/frontend`.**
- **Backend:** NestJS en ESM (`"type": "module"` — los imports internos llevan extensión `.js`), Prisma 6, Vitest.
- **Frontend:** React 19 + Vite + Tailwind 4 + React Router 7; tests con Vitest + Testing Library. **Una sola app sirve landing, panel y scanner** (ver el mapa de rutas abajo).
- **Base de datos:** Supabase local vía `supabase start` (API `:54321`, DB `:54322`, Studio `:54323`).
- **Autenticación:** Supabase Auth, tanto para el `OWNER` como para el `STAFF`. El trigger `handle_new_user` crea la fila `Merchant` y la membresía `OWNER` **solo cuando el usuario nuevo no trae `merchant_id` en `raw_user_meta_data`**. Si lo trae, es un mesero invitado y el trigger **no crea nada**: la membresía `STAFF` la inserta `StaffService` con la `service_role key`. **La metadata nunca otorga permisos**, porque la escribe el propio cliente en `signUp` con la anon key (ver §7.1, corrección del 2026-09-24).
- **`merchant.id === session.user.id` sigue siendo cierto para el `OWNER`** (el trigger reutiliza el UUID del usuario de auth), **pero ya no es la base de los permisos**: con dos roles eso se rompe. Los permisos salen de `MerchantUser`. Ver §7.8 por la deuda que esto deja en el panel.
- **El panel admin hoy consulta Supabase directamente** con la `anon key` (ver `apps/frontend/src/services/*`); no pasa por el backend NestJS. Por eso el permiso de solo-lectura del `STAFF` **se aplica en RLS, no escondiendo items del menú**: si el control viviera solo en la UI, el mesero entra igual escribiendo la URL.
- **Lo nuevo (desde el 2026-09-30) va por el backend:** reportería (§5.8), equipo (§6.4), tickets (§11.4) y todo `/internal/*`. El acceso directo del panel a Supabase no se extiende a módulos nuevos.
- **CORS (PR #13):** el backend solo acepta los orígenes de `ALLOWED_ORIGINS` (separados por comas, ver `apps/backend/.env.example`).
- **Tipos compartidos:** los contratos que usan el frontend y el backend (tickets, planes) se publican en **`packages/shared`**, que se crea en §11.4. Hoy `packages/` no existe; quien lo cree debe exponer los scripts de la CI (§10).

**Mapa de rutas del frontend** *(decisión 2, 2026-09-20 — reemplaza el `path="*"` → login)*

| Ruta | Qué es | Acceso | Dueño |
|---|---|---|---|
| `/` | Landing estática explicativa | **Público** | ✅ existe (`pages/public/Home.tsx`) — ver §8.6 |
| `/admin/login` | Login del dueño | Público | Dev 3 |
| `/admin/reset` | Recuperación de contraseña | Público | Dev 3 |
| `/admin/dashboard` · `/admin/promotions` · `/admin/customers` · `/admin/settings` | Panel | **Protegido, solo `OWNER`** (un `STAFF` cae a `/scan`) | ✅ existe |
| `/admin/analytics` · `/admin/reports` | Analítica (gráficos) y reportes exportables | Solo `OWNER` | Dev 1 · ⏳ nuevo (§5.8) |
| `/admin/team` | Equipo: invitar, listar, reasignar y dar de baja meseros | Solo `OWNER` | Dev 2 · ⏳ nuevo (§6.4) |
| `/admin/billing` | Mockup de facturación | Solo `OWNER`, tras `VITE_FEATURE_BILLING` | Dev 2 · ⏳ nuevo (§6.5) |
| `/admin/support` | Soporte: crear y seguir tickets | Solo `OWNER` | Dev 2 · ⏳ nuevo (§6.6) |
| `/admin/locations` | Sucursales de la marca, con mapa | Solo `OWNER` | Dev 3 · ⏳ nuevo (§11.3) |
| `/internal/*` | Panel interno de la plataforma | **Solo `PlatformAdmin`**. Cualquier otro cae a `/admin` o `/scan` según su rol | Dev 3 · ⏳ nuevo (§11) |
| `/join/:merchantName` | Landing de emisión del cliente final. El parámetro es `Merchant.slug` (ej. `/join/localcito`); con la decisión 5, el slug es del **local** | Público, sin login | Dev 2 |
| `/scan` | PWA del cajero | **Protegido: requiere sesión (`STAFF` u `OWNER`)** | Dev 2 |

**Por qué el panel queda namespaceado bajo `/admin/*`:** si mañana la landing se mueve a un sitio estático prerenderizado (por SEO y velocidad), **las URLs del panel no cambian**. Es la razón del prefijo; no es cosmética.

---

## 3. Estado del proyecto — qué está hecho y qué falta (verificado 2026-09-30)

> Verificado contra el código de `dev` (= `origin/dev`, con los PR #12 y #13 mergeados) y corriendo los tests: **backend 151 ✅ · frontend 138 ✅**. Lo marcado **(2026-09-24)** entró con el PR #11; lo marcado **(PR #12)** o **(PR #13)**, con esos PR.

### 3.1 ✅ Lo que ya está hecho

**Infraestructura y base de datos**
- [x] Monorepo pnpm (`apps/backend` + `apps/frontend`) con scripts raíz `dev / build / test / typecheck / lint`.
- [x] CI en cada PR a `main`/`dev` (`.github/workflows/pr-checks.yml`): install, `prisma generate`, `pnpm audit`, lint, typecheck, test y build.
- [x] Modelos `Merchant`, `MerchantUser`, `Promotion`, `Customer`, `Pass`, `Stamp`, `Scan` y la vista `PassStampBalance` (§4).
- [x] Sellos con vencimiento FIFO: un sello = una fila de `Stamp`. El saldo se calcula al leer; `Pass.stampsCount` ya no existe.
- [x] RLS por membresía en todas las tablas (SELECT para cualquier miembro, escritura solo `OWNER`), con `search_path` fijo en las funciones.
- [x] Grants de mínimo privilegio (`20260922120000_least_privilege_grants`): `anon` sin acceso a tablas; `authenticated` no puede leer `Pass.passToken`.
- [x] Trigger `handle_new_user`: crea el `Merchant` + `OWNER` solo para dueños. **(2026-09-24)** Ya no crea membresías a partir de `raw_user_meta_data`, que controla el cliente: antes cualquiera podía registrarse como OWNER de un local ajeno enviando `merchant_id` y `role` en `signUp` (migración `20260924190000_harden_signup_and_slug`).
- [x] **(2026-09-24)** `Merchant.slug`, identificador público de `/join/:slug`. Migración `20260924120000_merchant_slug`: backfill de los locales existentes, con sufijo `-2`, `-3` si hay colisión. **Los locales nuevos reciben un slug neutro `local-<8 hex del id>`** (`20260924190000`): no deriva del email del dueño y no colisiona. **Es estable: renombrar el local no lo cambia**, porque ya puede estar impreso en QR. Solo el OWNER lo cambia, con `PATCH /api/merchants/:merchantId/slug`: el panel no tiene permiso de escritura sobre esa columna.
- [x] **(2026-09-24)** Seed reproducible `apps/backend/prisma/seed.js`: local **"Café Demo" (`/join/cafe-demo`)** con 2 promociones activas, 1 `OWNER` y 4 `STAFF` (§9). Antes el seed le creaba por error un local propio a cada `STAFF` y no creaba promociones.
- [x] **(2026-09-24)** Mínimo privilegio: `anon` y `authenticated` no pueden ejecutar `slugify` ni `generate_merchant_slug` por `/rest/v1/rpc`, y `authenticated` solo puede actualizar `Merchant.name` y `stampValidityDays`.
- [x] `.env.example` versionado en backend y frontend.

**Backend — Dev 1** (PR #9 + cambios del 2026-09-24)
- [x] Fundaciones: `PrismaModule`, `ValidationPipe` estricta (`whitelist` + `forbidNonWhitelisted`), filtro de excepciones, `ConfigModule`, CORS, rate limiting (Throttler) y Swagger en `/api/docs`.
- [x] `POST /api/customers`: alta idempotente. **(2026-09-24)** Exige **RUT (módulo 11) y teléfono (`+569…`), los dos**, más `acceptedTerms: true`. Guarda la prueba del consentimiento en `Customer.termsAcceptedAt` y `termsVersion` (migración `20260924170000_customer_terms_acceptance`). A un cliente antiguo le completa el dato que le faltaba, pero **nunca sobrescribe** un RUT o teléfono ya registrado. Devuelve las URLs de billetera **solo la primera vez**, para que conocer un RUT ajeno no alcance para robarle la tarjeta.
- [x] `POST /api/passes/generate` (autenticado, requiere membresía) y `GET /api/passes/:passToken/apple` (`.pkpass`). `passToken` de 32 bytes aleatorios.
- [x] `POST /api/scan` (`STAMP` / `REDEEM`): transacción con `SELECT … FOR UPDATE` sobre el `Pass`, `expiresAt` congelado al sellar, canje FIFO con verificación atómica, `createdByUserId` en `Scan` y `Stamp` y datos del cliente enmascarados.
- [x] **(2026-09-24)** Ingreso manual: `/api/scan` acepta `customer: { rut | phone }` en lugar de `passToken`. La búsqueda queda acotada al comercio del cajero, y la membresía se valida antes de buscar.
- [x] **(2026-09-24)** Bloqueo antifraude: tras un sello, el pase no puede recibir otro durante **30 minutos**, ni por QR ni manual. Responde `alreadyScanned: true` con `nextStampAvailableAt` y los minutos restantes. Se configura con `STAMP_COOLDOWN_MINUTES`. El canje mantiene su ventana de 90 s contra el doble toque (§5.4).
- [x] **(2026-09-24)** `GET /api/merchants/by-slug/:slug`: público y con rate limit. Devuelve nombre, vigencia y promociones activas; nunca el email del dueño.
- [x] **(2026-09-24)** `PATCH /api/merchants/:merchantId/slug` (solo OWNER): normaliza y valida el slug, y responde 409 si ya lo usa otro local.
- [x] **(2026-09-24)** El ingreso manual tiene un límite de **10 búsquedas por minuto por usuario** (`ManualLookupLimiter`, 429). Sin él, `/api/scan` servía para averiguar si un RUT es cliente. El escaneo por QR no tiene límite. La respuesta al cajero ya no incluye `customer.id`.
- [x] **(2026-09-24)** La ventana anti-doble-canje de 90 s es **por promoción**. Antes, canjear A y enseguida B devolvía "ya canjeado" sin consumir sellos, y la caja mostraba "premio entregado".
- [x] **(2026-09-24)** El alta verifica la identidad: si el cliente ya existe, el RUT **y** el teléfono deben coincidir con lo guardado. Un dato faltante de un cliente antiguo no se completa sin verificación, y la aceptación de los términos se registra una vez por versión, sin sobrescribir la fecha original.
- [x] `POST /api/merchants/:merchantId/staff/invite`: solo `OWNER`, usa la `service_role key` en el backend e invita por email o crea el usuario con contraseña (§5.6). **(2026-09-24)** La membresía `STAFF` la crea este endpoint (`upsert`, sin degradar a nadie), no el trigger.
- [x] Modo desarrollo `ALLOW_MOCK_PASSES=true`: emite pases de prueba sin certificados de Apple/Google.
- [x] **(2026-09-24)** **Varias promociones activas con un saldo único de sellos** (decisión §8.2):
  - todo sello vigente sirve para cualquier promoción activa, y el cliente elige en caja cuál canjear;
  - `STAMP` ya no necesita saber la promoción;
  - `REDEEM` recibe `promotionId` (obligatorio si hay más de una activa) y consume FIFO solo los sellos que esa promoción pide;
  - la respuesta trae `availablePromotions` con `canRedeem` por promoción;
  - migración `20260924150000_scan_redeemed_promotion`: `Scan.promotionId` registra qué promoción se canjeó.
- [x] **(2026-09-24)** `GET /api/merchants/by-slug/:slug` devuelve también `activePromotions` (todas las activas, de la más reciente a la más antigua).
- [x] **(PR #13)** **Alta atómica** en `POST /api/customers`: transacción interactiva de Prisma; si choca con una clave única (P2002) reintenta la transacción completa, y si falla la generación de URLs de billetera se aborta todo, para no dejar clientes sin tarjeta.
- [x] **(PR #13)** **Auditoría del método de escaneo:** `Scan.method` (`QR` \| `MANUAL`, por defecto `QR`; migración `20260925130000_scan_method_audit`). El dashboard lo muestra en la actividad reciente.
- [x] **(PR #13)** **Borrado de datos personales (Ley 19.628):** `DELETE /api/customers/:customerId?merchantId=…`, solo `OWNER` (`ParseUUIDPipe` en ambos IDs). Borra el pase, los sellos y el historial del cliente en ese comercio; si no tiene pases en otros comercios, borra también el `Customer`.
- [x] **(PR #13)** **Base de Google Wallet:** con `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL` y `GOOGLE_WALLET_PRIVATE_KEY`, el backend firma el JWT `savetowallet` con un `loyaltyObject` (QR = `passToken`, puntos de fidelidad) sobre una clase por comercio (`GOOGLE_WALLET_CLASS_ID` la sobrescribe en sandbox). **La personalización visual del pase queda para el próximo sprint.**
- [x] **(PR #13)** CORS restringido a `ALLOWED_ORIGINS`. Se agregaron tests del `SupabaseAuthGuard` (sin token, header mal formado) y de los guards y la propiedad en `CustomersController`.
- [ ] ⚠️ **(PR #13) Aclaración: la recuperación de tarjeta por OTP NO entró**, aunque el título del PR la nombra. Se quitó en los commits de revisión (`SmsService`, endpoints OTP, `CustomerVerificationCode`). Sigue abierta en §3.2.
- [x] 151 tests de Vitest (incluye validación de los DTO de alta y de escaneo, concurrencia de sellos y de canjes, límite manual, slug, la ventana de canje por promoción, borrado de clientes y guards): sellado, anti-duplicado, bloqueo de 30 min, FIFO, varias promociones con saldo compartido, concurrencia de canje, ingreso manual, alta atómica, emisión, invitación de staff, slug y utilidades de RUT/teléfono.

**Frontend — Dev 2 y Dev 3** (PR #7, PR #10 + cambios del 2026-09-24)
- [x] Landing pública `/` (`pages/public/Home.tsx`).
- [x] Panel `/admin/*`: login, recuperación de contraseña, dashboard con métricas, CRUD de promociones, clientes con saldo desde `PassStampBalance` y configuración (nombre del local + vigencia de los sellos).
- [x] Guards de rol: un `STAFF` que entra a `/admin/*` termina en `/scan`. El panel usa el `merchantId` de la membresía (§7.8).
- [x] `/join/:merchantName` conectado al backend: muestra el local, la promoción y la vigencia, valida el RUT/teléfono, incluye el aviso de la Ley 19.628 y muestra botones de billetera según la plataforma.
- [x] `/scan`: cámara con `html5-qrcode`; estados de sello, premio, error y "ya escaneado"; feedback sonoro y háptico; canje con confirmación.
- [x] **(2026-09-24)** Ingreso manual del escáner conectado al backend. Antes llamaba a un contrato que no existía.
- [x] **(2026-09-24)** Cámara estabilizada (`QRCam.tsx`): no arranca dos veces con `StrictMode`, no se reinicia en cada render, la zona de lectura coincide con el marco visible y usa el `BarcodeDetector` nativo cuando existe.
- [x] **(2026-09-24)** La pantalla amarilla muestra los minutos que faltan para el siguiente sello.
- [x] **(2026-09-24)** Campos `RutField` y `PhoneField` (`components/ui/IdentifierInput.tsx`). `/join` usa los dos a la vez (ambos obligatorios); el ingreso manual de `/scan` usa `IdentifierInput`, que agrega un selector RUT / Teléfono porque ahí basta con uno para buscar al cliente:
  - el RUT se autoformatea a `12.345.678-5` mientras se escribe y se valida por módulo 11, con 7 u 8 dígitos igual que el backend;
  - el teléfono lleva el **prefijo `+56` fijo** y exige 9 dígitos que empiecen con 9; si se pega un número con `+56`, no se duplica;
  - envía siempre `+569XXXXXXXX`.
- [x] **(2026-09-24)** `/join` destaca la promoción activa más reciente y, si hay otras, las lista con el aviso de que los sellos vigentes sirven para cualquiera y se elige en caja.
- [x] **(2026-09-24)** Pantalla de premio en `/scan`: lista todas las promociones activas; las que el saldo no cubre aparecen deshabilitadas con "Faltan N". Si hay una sola canjeable queda preseleccionada, y siempre existe la opción "No canjear ahora, seguir juntando".
- [x] **(2026-09-24)** `/join` exige RUT + teléfono y un **checkbox obligatorio de aceptación** con link a los términos, que abre en pestaña nueva para no perder lo escrito.
- [x] **(2026-09-24)** Página pública **`/terminos`** (`pages/public/Terms.tsx`) con términos y condiciones estándar para el programa: registro, sellos sin valor monetario, bloqueo de 30 min, vigencia, saldo compartido entre promociones, uso indebido, datos personales (Ley 19.628) con derechos y vía de contacto, responsabilidad y ley aplicable (Ley 19.496). Enlazada desde `/join` y el footer de `/`.
- [x] **(2026-09-24)** Configuración del panel: muestra el **link de registro** con botón para copiarlo y permite personalizarlo, con la advertencia de que invalida los QR impresos.
- [x] **(2026-09-24)** Correcciones de la revisión del PR #11:
  - `ScanReward` avisa "sello de esta visita no sumado" cuando hay cooldown;
  - un doble toque de canje ya no se muestra como "premio entregado";
  - los errores del backend muestran `message` y no "Bad Request" (`lib/apiError.ts`);
  - el cursor no salta al editar el RUT o el teléfono, y el backspace sobre separadores funciona;
  - la cámara usa una cola de start/stop a nivel de módulo y tiene botón "Reintentar";
  - `/join` distingue un local inexistente de un error de red y no muestra el formulario si el local no tiene promociones.
- [x] **(PR #12)** **PWA instalable:** `vite-plugin-pwa` con `registerType: 'autoUpdate'`, manifiesto "Fidelity Wallet" (tema oscuro) e íconos `pwa-192x192.png` y `pwa-512x512.png`.
- [x] **(PR #12)** **Sesión resiliente en la caja:** `useAuth` refresca la sesión en `visibilitychange` cuando faltan menos de 5 min para que venza, y `scanService` reintenta una vez tras un 401 después de refrescar el token. `useOnlineStatus` distingue la caída de red.
- [x] **(PR #12)** **Badges oficiales** de Apple Wallet y Google Wallet (versión en español de LatAm, `.svg` en `public/`) en `JoinSuccess`.
- [x] **(PR #12)** **Tests de `Join.tsx`** (checkbox obligatorio, error de red, local sin promociones, con un `fetch` en memoria y sin `vi.fn`) y **de `QRCam.tsx`** (cola de start/stop con `StrictMode`).
- [x] **(PR #13)** Tabla de clientes con botón de borrado y `ConfirmDialog`. El dashboard muestra QR vs. MANUAL por escaneo.
- [x] 138 tests de Vitest + Testing Library (incluye un test que falla si `TERMS_VERSION` difiere entre frontend y backend).
- [ ] ⚠️ En la copia local de `dev` hay cambios **sin commitear** en `hooks/useAuth.ts` y `lib/api.ts`, que protegen `getSession()` cuando devuelve error o `data` vacío. Si son tuyos, súbelos en un PR.

**Flujo completo verificado en local (2026-09-24), con pases mock:** `/join/localcito` → alta del cliente → sello por QR y por RUT/teléfono → bloqueo de 30 min → premio desbloqueado → canje FIFO. También se verificó con **dos promociones activas**: se puede sellar, el canje exige elegir, rechaza si el saldo no alcanza y descuenta solo lo de la promoción elegida.

### 3.2 ⏳ Lo que falta, por responsable

Prioridad: 🔴 bloquea el piloto · 🟠 necesario para el piloto · 🟡 deuda · ⚪ opcional.

> **Orden de dependencia (2026-09-30):** la migración `Brand > Location` + `LoyaltyProgram` de Dev 3 (§11.2) **va primero**. Mientras no esté mergeada, Dev 1 y Dev 2 trabajan contra el esquema actual (`Merchant` = un local), con rutas nuevas ya pensadas para `brandId`. La migración conserva los IDs (§11.2), así que el cambio de rama es mecánico.

#### Dev 1 — Backend, motor de pases y reportería

**Nuevo foco: reportería y analítica del dueño (§5.8)**
- [ ] 🟠 **Módulo `reports`** en NestJS con `GET /api/brands/:brandId/reports/{overview,retention,promotions,locations,staff}`. Solo `OWNER`, con filtros `from`/`to`/`locationId` y zona `America/Santiago` (contrato en §5.8).
- [ ] 🟠 **Retención y recurrencia:** clientes nuevos vs. recurrentes, frecuencia de visita, clientes dormidos y cohortes por mes de alta.
- [ ] 🟠 **Rendimiento por promoción:** canjes por promoción (`Scan.promotionId`), sellos vencidos sin usar (breakage) y días promedio hasta el canje. *Absorbe la tarea "métricas por promoción" que tenía el Dev 3 anterior.*
- [ ] 🟠 **Comparativo por local y heatmap día × hora.** Depende de `locationId` en `Scan` (§11.2); mientras tanto, se agrupa por comercio.
- [ ] 🟠 **Actividad por mesero y antifraude:** sellos por `createdByUserId`, porcentaje `MANUAL` por mesero y alertas de auto-sellado (heurísticas en §5.8).
- [ ] 🟡 **Exportar a Excel (`.xlsx`)**: `GET …/reports/export`. El plan lo vende como "Reportes exportables a Excel" (§6.5).
- [ ] 🟡 **Pantallas `/admin/analytics` y `/admin/reports`** en el frontend, también de Dev 1. Hay que elegir la librería de gráficos: hoy el frontend no tiene ninguna.
- [ ] 🟡 Índices para las agregaciones (`Scan(merchantId, createdAt)`, `Stamp(expiresAt)`…), acordados con Dev 3 en la misma migración o en una siguiente.

**Motor de pases (sigue en su lista, detrás de la reportería)**
- [x] 🟠 **Base de emisión de Google Wallet** (PR #13): JWT `savetowallet` firmado con credenciales reales.
- [ ] 🟠 **Personalización del pase de Google** (clase, colores, logo, textos): próximo sprint. Probar el guardado en un Android real con la cuenta de Issuer.
- [ ] 🟠 **Credenciales y emisión real de Apple Wallet** (§7.3): Pass Type ID, `.p12` y WWDR. Sin ellas, en iPhone solo funciona el `.pkpass` mock.
- [ ] 🟠 **Push de actualización real** (§5.5). `notifyPassUpdate` y `GoogleWalletService.updateLoyaltyObject` hoy solo escriben un log. Falta el web service de PassKit (`/v1/devices/...`) con APNs y el PATCH del `loyaltyObject`. Falta además invalidar el objeto de Google (`state: INACTIVE`) y el pase de Apple (`voided`) cuando se borra un pase, incluido el borrado de la Ley 19.628.
- [ ] 🟠 **Adaptar el motor a la decisión 5 junto con Dev 3:** `/api/scan`, alta y emisión pasan a resolver el `Pass` por `(customerId, programId)` y a registrar `locationId`. Dev 1 revisa el PR de la migración.
- [ ] 🟠 **Recuperar un pase perdido** y **verificación por OTP SMS.** Siguen abiertas: el PR #13 las quitó antes del merge. Un cliente antiguo con un solo dato guardado sigue identificándose solo por ese dato.
- [ ] 🟡 Tests pendientes del DoD (§5.7): vencimiento contra una BD real (hoy la query está mockeada), no-retroactividad de `stampValidityDays` y e2e reales (`test/app.e2e-spec.ts` sigue siendo el del boilerplate).
- [ ] 🟡 **Tests del SQL** (`slugify`, `generate_merchant_slug`, `handle_new_user`) contra una BD real, con pgTAP o un e2e en `test/`. *Parcial (2026-09-30): `handle_new_user`, RLS y triggers ya están cubiertos en `test/db` (Dev 3, PR1). Faltan `slugify` y `generate_merchant_slug`, que se pueden agregar a la misma suite.*
- [ ] 🟡 **`ManualLookupLimiter` es en memoria y por instancia.** Con más de una instancia del backend hay que moverlo a un store compartido (Redis).
- [x] 🟠 `POST /api/customers` atómico (PR #13).
- [x] 🟡 Borrado de datos personales, Ley 19.628 (PR #13).
- [x] 🟡 Auditoría QR vs. MANUAL en `Scan.method` (PR #13).
- [ ] ⚪ Opcional: pase web `/pase/:passToken` como respaldo para quien no usa billetera.
- [ ] ⚪ Opcional: `locations` en el `pass.json` de Apple a partir de `Location.lat/lng`, que es la base de las "notificaciones por ubicación" del plan (§6.5).

#### Dev 2 — PWA del cajero, landing, Equipo, Facturación y Soporte

**Nuevo: Equipo (§6.4) — full-stack en el módulo `staff`**
- [ ] 🟠 Backend: listar, reenviar invitación, reasignar local y dar de baja (`GET`, `POST …/resend`, `PATCH`, `DELETE` en §6.4). El `invite` que ya existe pasa a recibir `locationId`. Dev 1 revisa el PR.
- [ ] 🟠 UI `/admin/team`: tabla de meseros con estado (`INVITED` \| `ACTIVE`), local asignado, último ingreso y acciones con `ConfirmDialog`.
- [ ] 🟡 Mostrar el uso contra el límite del plan ("3 de 3 usuarios"), leído del mockup de suscripción (§6.5). **No se bloquea en el backend todavía** (§8.11).

**Nuevo: mockup de Facturación (§6.5)**
- [ ] 🟠 `/admin/billing` tras `VITE_FEATURE_BILLING`: plan actual, uso vs. límites, los 4 planes con precio mensual/anual, historial de boletas simulado y "cambiar plan" deshabilitado.
- [ ] 🟠 Banner de periodo de prueba ("te quedan N días") en el layout del panel, con el botón "Suscribirme" apuntando a `/admin/billing`.
- [ ] 🟡 Catálogo de planes como constante tipada en `packages/shared` (§6.5), para que Dev 1 (gating de métricas y exportación) y Dev 3 (plan de cada marca en `/internal`) lean lo mismo.

**Nuevo: mockup de Soporte (§6.6)**
- [ ] 🟠 `/admin/support`: formulario (categoría, descripción, local opcional, teléfono opcional, captura opcional PNG/JPG ≤ 10 MB) y tarjeta "Otras formas de contacto" (correo y WhatsApp desde `VITE_SUPPORT_EMAIL` / `VITE_SUPPORT_WHATSAPP`).
- [ ] 🟠 "Mis solicitudes": lista con número, categoría, estado y fecha, y detalle con el hilo de mensajes y respuesta.
- [ ] 🟠 Programar contra **los tipos de §11.4** (`packages/shared`) con un adaptador en memoria (`supportService` con la misma firma que tendrá la API). Cuando Dev 3 publique los endpoints, solo se cambia el adaptador. *(2026-10-01: **la API ya existe** (PR2 de Dev 3), así que se puede ir directo contra ella. Para importar los tipos, agregar `"@fidelity/shared": "workspace:*"` a `apps/frontend`.)*

**Escáner y landing (lo que quedaba)**
- [ ] 🔴 **Probar la cámara en iOS Safari y Android Chrome reales** y medir el objetivo de < 2 s. Fuera de `localhost` la cámara exige **HTTPS**.
- [ ] 🟠 **Probar la sesión con varias horas de pantalla abierta.** El refresh automático ya existe (PR #12); falta la prueba real en una tablet.
- [ ] 🟡 **Probar en un teléfono real la pantalla de elección de premio** con 3 o más promociones: lista larga en pantallas chicas y uso con una mano.
- [ ] 🟡 **`/scan` con locales (decisión 7):** el `STAFF` escanea en su `locationId`. Un `OWNER` con varios locales elige el local al abrir `/scan`.
- [ ] 🟠 **QR imprimible del link de registro** *(reasignada desde el Dev 3 anterior).* Configuración ya muestra el link y permite copiarlo; falta generar el QR para imprimir, uno por local.
- [ ] 🟡 **Texto del panel de promociones** *(reasignada):* explicarle al dueño que puede tener varias activas y que los sellos sirven para cualquiera.
- [x] 🟠 PWA instalable (PR #12).
- [x] 🟠 Refresh automático de sesión y reintento en 401 (PR #12).
- [x] 🟡 Badges oficiales de Apple y Google Wallet (PR #12).
- [x] 🟡 Tests de `Join.tsx` y `QRCam.tsx` sin `vi.fn` (PR #12).
- [ ] ⚪ Opcional: mostrar al cajero `nextExpiryAt` ("te vence un sello el jueves"); el backend ya lo devuelve.

#### Dev 3 — Infra, base de datos y panel interno (§11)

**Fase 1 — migración `Brand > Location` + `LoyaltyProgram` (primera tarea: bloquea a los otros dos)** — *(2026-09-30, PR1 de Dev 3, pendiente de merge)*
- [x] 🔴 Migración `20260930120000_brands_locations_programs` con `Brand`, `LoyaltyProgram`, `BrandMember`, `PlatformAdmin` y `AuditLog`, más el backfill. **La tabla `Merchant` NO se renombra:** pasa a significar "local" (glosario en §4.1). Probada sobre datos reales (1 local, 9 pases) y desde cero, sin drift contra `schema.prisma`.
- [x] 🔴 RLS por marca (`current_brand_ids()`, `is_brand_owner()`, `current_program_ids()`, `is_program_owner()`; `current_merchant_ids()` e `is_merchant_owner()` conservan su firma), triggers de consistencia y `handle_new_user` (crea `Brand` + `Merchant` + `LoyaltyProgram` + `OWNER`). `raw_user_meta_data` sigue sin decidir permisos.
- [x] 🔴 Backend adaptado (scan, customers, passes, merchants, staff) con el helper `common/access/brand-access.ts`; panel adaptado (membresía, dashboard, clientes, promociones, configuración); seed con 2 locales y un `SUPERADMIN`. Flujo real verificado: alta en un local, sellos alternando locales, canje en el otro, y 403 al mesero en un local ajeno.
- [x] 🟠 Tests del SQL contra BD real: `pnpm --filter backend run test:db` (15 tests de RLS, triggers y `handle_new_user`) y job `db-tests` en la CI con Supabase local. *Cierra el pendiente 🟡 de tests del SQL de Dev 1 para `handle_new_user`.*
- [ ] 🟡 Dev 1 revisa el PR1 (impacto en `/api/scan`, alta y emisión).
- [x] 🟠 `packages/shared` (`@fidelity/shared`) con los scripts de CI y el contrato de tickets (§11.4). *(PR2)*

**Fase 2 — sucursales del dueño**
- [ ] 🟠 `/admin/locations`: CRUD de locales con dirección, comuna, región, contacto y mapa **Leaflet + OpenStreetMap** con pin arrastrable. Geocoding por `GET /api/geocode?q=` (proxy a Nominatim, con rate limit y `User-Agent` propio).

**Fase 3 — panel interno `/internal/*`**
- [x] 🟠 Guard `PlatformAdminGuard` en `/api/internal/*` y `GET /api/internal/me` *(PR2)*.
- [ ] 🟠 En el frontend: rutas `/internal/*` con `React.lazy` y redirección si no es admin interno *(PR4)*.
- [ ] 🟠 Marcas: listado con búsqueda (plan, estado, número de locales y clientes) y detalle (locales, programas, promociones, contacto del `OWNER`, actividad).
- [ ] 🟠 Mapa con todas las sucursales.
- [ ] 🟠 Editar la configuración de marcas y locales y suspender o reactivar una marca, con cada cambio en `AuditLog` (solo `SUPERADMIN`).
- [x] 🟠 **API de tickets** (§11.4): endpoints del dueño e internos, adjuntos en Storage, `AuditLog` y cierre automático *(PR2)*.
- [ ] 🟠 **Bandeja de tickets en `/internal`** (UI): filtros, asignación, estados, prioridad, respuestas y notas internas *(PR4)*.
- [ ] 🟡 Búsqueda de clientes finales con RUT y teléfono **enmascarados**; ver el dato completo exige un motivo y queda en `AuditLog` (solo `SUPERADMIN`, Ley 19.628).
- [ ] 🟡 Visor de `AuditLog`.

**Heredado del Dev 3 anterior**
- [ ] 🟡 Llaves de producción y despliegue (§7.5).

#### Equipo — legal
- [ ] 🔴 **Completar y validar los términos antes de producción.** Definir `VITE_LEGAL_COMPANY`, `VITE_LEGAL_COMPANY_RUT`, `VITE_LEGAL_ADDRESS` y `VITE_LEGAL_CONTACT_EMAIL` (ver `apps/frontend/.env.example`). Mientras falten, `/terminos` muestra los marcadores `[…]` y un aviso visible de borrador. El texto es una plantilla estándar y **necesita revisión de un abogado**, incluida la adecuación a la Ley 21.719 de protección de datos cuando entre en vigencia.
- [ ] 🟠 **Los términos deben cubrir el saldo compartido entre locales de una marca** (decisión 5) y el acceso de nuestro equipo de soporte a los datos (§11.5).
- [ ] 🟡 Si cambia el texto de los términos, subir `TERMS_VERSION` en `Terms.tsx` **y** en `apps/backend/src/customers/terms.ts` en el mismo PR.

#### Equipo — decisiones abiertas (§8)
- [ ] §8.5 — ¿Quién puede anular un sello mal dado o agregar uno manual sin cliente presente?
- [ ] §8.8 — Aviso de vencimiento: con cuánta antelación, por qué canal y quién lo construye.
- [ ] §8.1 — Confirmar token estático + bloqueo de 30 min como política antifraude del MVP. *Con la decisión 5, ¿el bloqueo de 30 min es por marca o por local?* Recomendación: por marca, para que no se pueda sellar dos veces cruzando la calle.
- [ ] §8.10 — Programas de lealtad no basados en sellos: orden de entrada y modelo.
- [ ] §8.11 — Planes: moneda (USD vs. CLP), IVA y boleta, y cuándo se aplican los límites en el backend.
- [x] §8.12 — Marca suspendida: sin acceso, datos conservados (implementado en el PR #16).
- [ ] 🟠 §8.12 — **Legal:** retención de la base de clientes a 2 años de una cuenta suspendida. Requiere cambio de términos, o bien anonimizar.

---

## 4. Modelo de datos (contrato compartido — no cambiarlo sin avisar)

`apps/backend/prisma/schema.prisma` es la **única fuente de verdad**. Cualquier cambio va por migración Prisma y se avisa al equipo, porque el panel admin tipa contra estas mismas tablas.

| Modelo | Campos clave | Notas que importan |
|---|---|---|
| `Merchant` | `id` (UUID = auth user id del `OWNER`), `name`, `email` (único), `slug` (único), `stampValidityDays?` | Creado por trigger al registrarse el dueño. **`slug` (2026-09-24)** es el identificador público de `/join/:slug`: lo genera el trigger, no cambia al renombrar el local y **nunca se usa para escribir** (las escrituras van por `id`). **Esa igualdad ya no define permisos** — ver `MerchantUser` y §7.8. `stampValidityDays` **nullable: `null` = los sellos de este local no vencen.** Es una regla del local, no del premio: el dueño la configura una sola vez en Configuración, junto al nombre del negocio |
| `MerchantUser` | `userId` (= `auth.users.id`), `merchantId`, `role` (`OWNER` \| `STAFF`), PK compuesta `[userId, merchantId]` | **Nuevo 2026-09-20.** Es la fuente de verdad de los permisos. Todas las políticas RLS se evalúan contra esta tabla |
| `Promotion` | `merchantId`, `name`, `targetStamps`, `rewardName`, `isActive` | La vigencia de los sellos **no vive acá**: se movió a `Merchant` (2026-09-21). **Puede haber varias promociones activas a la vez, y es intencional** (decisión §8.2, 2026-09-24): todas se canjean contra el mismo saldo de sellos. La más reciente es la "de referencia", la que destacan la landing y el pase |
| `Customer` | `rut?` (único), `phone?` (único), `termsAcceptedAt?`, `termsVersion?` | **Desde 2026-09-24 el alta exige los dos datos** y la aceptación de los términos. Lo valida y normaliza el backend en `POST /api/customers` (RUT `12345678-5`, teléfono `+569XXXXXXXX`). En la BD siguen siendo nullables porque hay clientes antiguos con un solo dato y sin aceptación registrada |
| `Pass` | `customerId`, `merchantId`, `passToken` (único), `@@unique([customerId, merchantId])` | **`stampsCount` FUE ELIMINADO (2026-09-20).** El saldo se lee de `PassStampBalance`. **Un solo pase por cliente por comercio.** El pase **no tiene `promotionId`, y no lo necesita**: su saldo sirve para todas las promociones activas (§8.2) |
| `Stamp` | `passId`, `merchantId`, `promotionId?`, `earnedAt`, `expiresAt?`, `consumedAt?`, `consumedByScanId?`, `sourceScanId?`, `createdByUserId?` | **Nuevo 2026-09-20. Un sello = una fila.** `expiresAt` se **congela al sellar** (`earnedAt` + `Merchant.stampValidityDays`) y no se recalcula: cambiar la vigencia **no afecta retroactivamente** sellos ya entregados. `promotionId` es `ON DELETE SET NULL` a propósito: borrar una promoción no puede vaciarle la tarjeta a nadie. **Desde 2026-09-24 los sellos nuevos se crean con `promotionId` NULL**, porque un sello es saldo del pase y no de una promoción. La columna queda solo como historial y **no se usa para contar saldo** |
| `Scan` | `passId`, `merchantId`, `type`, `method`, `promotionId?`, `createdByUserId?` | **`method` (PR #13): `ScanMethod = QR \| MANUAL`, por defecto `QR`.** Es la base del antifraude por mesero (§5.8). `ScanType = STAMP_ADDED \| REWARD_REDEEMED`. Es el libro contable: no se edita ni se borra. **`promotionId` (2026-09-24) solo se llena en `REWARD_REDEEMED`: qué premio eligió el cliente.** **`createdByUserId` (nuevo) dice qué mesero dio cada sello** — es lo que permite detectar al que se auto-sella |
| `PassStampBalance` *(vista)* | `passId`, `merchantId`, `customerId`, `activeStamps`, `nextExpiryAt` | **Nueva. El saldo se calcula al leer**: `activeStamps` cuenta los sellos no consumidos y no vencidos. Creada con `security_invoker = true` para que **el RLS siga aplicando** (una vista normal corre con los permisos de su dueño y saltearía el RLS). `nextExpiryAt` ignora a propósito los sellos sin fecha de vencimiento |

**Convenciones:** tablas y columnas en **PascalCase/camelCase** entrecomilladas en SQL (`"Stamp"."expiresAt"`), no snake_case. Los IDs son UUID generados por Postgres (`gen_random_uuid()`).

### 4.1 Brand > Location (decisiones 5 a 8) — implementado en `20260930120000_brands_locations_programs`

> **Glosario: `Merchant` = local (Location).** La tabla y la columna `merchantId` **no se renombraron**, para no romper el RLS, el panel, los QR impresos ni los PR abiertos de Dev 1 y Dev 2. En código nuevo, "merchant" significa "local"; "brand", "marca". Donde §0.1, §3.2, §5.8, §6.4 u §11 digan `Location`/`locationId`, léase `Merchant`/`merchantId`.
>
> Las filas `Merchant`, `MerchantUser`, `Promotion`, `Pass`, `Stamp` y `Scan` de la tabla de arriba quedan **reemplazadas** por esta.

| Modelo | Campos clave | Notas |
|---|---|---|
| `Brand` | `id`, `name`, `legalName?`, `taxId?`, `contactEmail?`, `contactPhone?`, `status` (`ACTIVE` \| `SUSPENDED`) | **`Brand.id` = id de su primer local** en toda marca migrada o registrada sola, así que `brandId = merchantId` para esos datos. Marca suspendida: `/join` responde 404, el alta 404 y `/api/scan` 403. *`planId`/`trialEndsAt` quedan para el mockup de facturación (§6.5)* |
| `Merchant` (local) | + `brandId`, `address?`, `commune?`, `region?`, `latitude?`, `longitude?`, `phone?`, `contactName?`, `isActive`; `email` pasa a nullable | Conserva `id`, `slug` y `name`. **`stampValidityDays` se eliminó** (vive en el programa). Local inactivo: mismo trato que marca suspendida |
| `BrandMember` | `userId`, `brandId`, `role`, `merchantId?` · PK `[userId, brandId]` | **Reemplaza a `MerchantUser` (eliminada).** CHECK: `OWNER` sin local, `STAFF` con local; un trigger exige que el local sea de la marca |
| `LoyaltyProgram` | `id`, `brandId`, `type` (`STAMPS`), `scope` (`BRAND`; `LOCATION` reservado), `name`, `stampValidityDays?`, `isActive` | A lo más **un `STAMPS` por marca** (trigger `loyalty_program_single_stamps`). Programa inactivo = sin promociones canjeables |
| `Promotion` | `programId` en vez de `merchantId` | |
| `Pass` | + `programId`, `brandId` · **`@@unique([customerId, programId])`** | `merchantId` queda como **local de alta**. `brandId` lo fija el trigger `pass_derive_brand` |
| `Stamp` · `Scan` | + `brandId`, `programId` | `merchantId` = local donde ocurrió. `brandId`/`programId` los fija el trigger `ledger_derive_from_pass`: lo que mande el backend se ignora, y un local de otra marca es rechazado |
| `PassStampBalance` *(vista)* | + `brandId`, `programId` | Sigue con `security_invoker` |
| `PlatformAdmin` | `userId` (PK), `role` (`SUPERADMIN` \| `SUPPORT`) | RLS sin políticas y sin grants para `anon`/`authenticated` |
| `AuditLog` | `actorUserId`, `actorType`, `action`, `entity`, `entityId?`, `before?`, `after?`, `reason?` | Append-only. Mismo tratamiento que `PlatformAdmin` |
| `Ticket` · `TicketMessage` · `TicketAttachment` | ver §11.4 | ⏳ PR2 de Dev 3 |

**RLS resultante:**
- **`OWNER`:** toda su marca.
- **`STAFF`:**
  - `Merchant` y `Scan` solo de su local.
  - `Pass`, `Stamp` y `PassStampBalance` de toda la marca, porque el saldo es de la marca. `Stamp` no tiene datos personales y la vista suma sobre él (corrección de la revisión del PR #16). Sin `passToken`.
  - `Customer`: nada, igual que antes.
- **Marca suspendida:** sus miembros no ven ni escriben nada; solo ven la fila de su `Brand`, para que el panel diga "cuenta suspendida". Todos los helpers del RLS filtran por `Brand.status = ACTIVE` a través de `active_memberships()`. En el backend, `resolveLocationAccess` exige por defecto un local operativo, salvo en el borrado por la Ley 19.628 (§8.12).
- **Escritura del panel:** solo `Merchant.name`, `LoyaltyProgram.name`/`stampValidityDays` y `Promotion`, y solo el `OWNER`. Ya no hay escritura sobre membresías.
- **Admin interno:** para que el trigger no le cree una marca, el usuario se crea con `user_metadata.platform_admin = true`. El flag no otorga nada: el acceso lo da la fila en `PlatformAdmin`.

---

## 5. Dev 1 — Backend y Motor de Pases

**Objetivo:** ser el único lugar donde viven las reglas de negocio y las llaves privadas. Nadie más firma pases ni decide si un sello es válido.

### 5.1 Fundaciones (hacer primero: desbloquea todo lo demás)
- `PrismaModule` global + `PrismaService` (`onModuleInit` → `$connect`).
- `ValidationPipe` global con `class-validator` / `class-transformer` y DTOs por endpoint.
- Manejo de errores uniforme (filtro de excepciones) y `ConfigModule` para el `.env`.
- CORS habilitado para los orígenes de la PWA y del landing.
- Swagger en `/api/docs` — **es el contrato con el que Dev 2 trabaja en paralelo**; publicarlo temprano, aunque los endpoints devuelvan datos simulados.

### 5.2 `POST /api/customers` — alta del cliente final
```jsonc
// request
{ "merchantId": "uuid", "rut": "12.345.678-5", "phone": "+56912345678", "acceptedTerms": true }  // los tres obligatorios
// response 201
{ "customerId": "uuid", "passId": "uuid", "isNew": true,
  "appleWalletUrl": "...", "googleWalletUrl": "..." }  // URLs solo si el pase se creó en esta llamada
```
*(✅ Implementado. El comercio se resuelve antes por su slug con `GET /api/merchants/by-slug/:slug` → `{ id, name, slug, stampValidityDays, activePromotion, activePromotions }`.)*
- Normalizar el RUT (sin puntos, con guion, dígito verificador en mayúscula) **antes** de consultar, y validar el módulo 11. Sin esto, `12345678-5` y `12.345.678-5` crean dos clientes distintos.
- Idempotente: si el cliente ya existe se reutiliza; si ya tiene pase en ese comercio se devuelve el existente (lo fuerza el `@@unique`).

### 5.3 `POST /api/passes/generate` — emisión
- Entrada: `customerId` + `merchantId`.
- Genera y firma el `.pkpass` (Apple) con `passkit-generator`, y el JWT de Google Wallet con `googleapis`.
- El QR del pase codifica el `passToken`.
- Salida: `{ "appleWalletUrl": "...", "googleWalletUrl": "..." }`.
- Guardar el `passToken` en `Pass` (único). Generarlo con entropía criptográfica: nunca derivarlo del RUT ni de un ID secuencial.

### 5.4 `POST /api/scan` — el corazón del sistema
*(Reescrito 2026-09-20 — decisión 1. La versión anterior hacía `stampsCount: { increment: 1 }`; esa columna ya no existe.)*

*(Contrato actualizado 2026-09-24: es el que implementa el backend. La fuente de verdad es el Swagger en `/api/docs`.)*

```jsonc
// request — QR o ingreso manual (uno de los dos)
{ "merchantId": "uuid", "action": "STAMP" | "REDEEM", "passToken": "..." }
{ "merchantId": "uuid", "action": "STAMP" | "REDEEM", "customer": { "rut": "12.345.678-5" } }  // o { "phone": "912345678" }
// "promotionId": "uuid" — solo en REDEEM: el premio que eligió el cliente. Obligatorio si hay más de una
// promoción activa. En STAMP se ignora: el sello va al saldo del pase, no a una promoción (§8.2)

// response 200
{
  "success": true,
  "alreadyScanned": false,              // true = ignorado por el bloqueo de 30 min (sello) o de 90 s (canje)
  "action": "STAMP",
  "passId": "uuid",
  "activeStamps": 4,                    // saldo del pase: sellos vigentes y no consumidos
  "targetStamps": 8,                    // STAMP: de la promoción más reciente · REDEEM: de la canjeada
  "rewardUnlocked": true,               // el saldo alcanza para AL MENOS una promoción activa
  "rewardName": "Almuerzo gratis",
  "availablePromotions": [              // todas las activas, más reciente primero
    { "id": "uuid", "name": "Almuerzo", "rewardName": "Almuerzo gratis", "targetStamps": 8, "canRedeem": false },
    { "id": "uuid", "name": "Café", "rewardName": "Café gratis", "targetStamps": 3, "canRedeem": true }
  ],
  "nextExpiryAt": "2026-10-24T03:30:39Z",
  "nextStampAvailableAt": "...",        // solo en un sello bloqueado
  "customer": { "rut": "12.***.*78-5", "phone": null },   // solo enmascarado, sin id interno
  "message": "¡Sello agregado! El cliente ya puede canjear un premio (4 sellos)"
}
```

Reglas, **todas dentro de una transacción de base de datos**:
1. Resolver el `Pass` por `passToken` o, en el ingreso manual, por `customer { rut | phone }` dentro del `merchantId` que escanea. Token inexistente o cliente sin tarjeta en el local → **404**; pase de otro local → **403**. En ningún caso se registra nada. El ingreso manual tiene un límite de 10 búsquedas por minuto por usuario (429).
2. Validar que exista **al menos una** `Promotion` activa para ese comercio. Puede haber varias (§8.2).
3. Insertar la fila en `Scan` (`STAMP_ADDED` o `REWARD_REDEEMED`), con `createdByUserId` = el usuario autenticado que ejecuta el escaneo y, en el canje, `promotionId` = la promoción elegida.
4. **En `STAMP`: insertar una fila en `Stamp`** con `passId`, `merchantId`, `promotionId = NULL` (el sello es saldo del pase), `earnedAt = now()`, `sourceScanId` = el `Scan` recién creado, `createdByUserId`, y `expiresAt` = `earnedAt` + `Merchant.stampValidityDays`, o `NULL` si el comercio no define vigencia. Al vivir en el comercio, el cálculo no depende de resolver antes qué promoción aplica (§8.2). **`expiresAt` se congela acá y no se vuelve a tocar nunca.**
5. Leer el saldo del pase (`activeStamps`), que es el mismo que calcula `PassStampBalance`: **todos** los sellos vigentes, sin filtrar por promoción. Para cada promoción activa, `canRedeem = activeStamps >= targetStamps`; el premio está desbloqueado si alguna lo cumple.
6. **En `REDEEM`:** el cliente elige la promoción (`promotionId`). Rechazar si no está activa o si `activeStamps < targetStamps` **de esa promoción**. Al canjear, **consumir los `targetStamps` de esa promoción, tomando los sellos activos MÁS ANTIGUOS del saldo (FIFO, por `earnedAt` ascendente)** marcándolos con `consumedAt = now()` y `consumedByScanId`. Seleccionarlos y marcarlos dentro de la misma transacción, con bloqueo de filas, para que dos cajas no consuman el mismo sello.
7. **El saldo se calcula SIEMPRE al leer.** Nunca se guarda un contador y **ningún cron es responsable de la corrección**: un sello vencido deja de contar solo, porque la vista lo filtra. Un job programado servirá más adelante **únicamente** para disparar el push de aviso de vencimiento (§7.7), no para arreglar saldos.

**Anti-fraude mínimo del MVP:** tras sumar un sello, el pase queda **bloqueado 30 minutos** para recibir otro en ese comercio, llegue por QR o por ingreso manual (RUT/teléfono). Un escaneo dentro del bloqueo responde éxito idempotente con `alreadyScanned: true`, `nextStampAvailableAt` y un mensaje con los minutos restantes, para que la PWA lo muestre distinto. El bloqueo se evalúa dentro del lock de fila del `Pass`, así que dos cajeros simultáneos no pueden colar un segundo sello. Se configura con `STAMP_COOLDOWN_MINUTES` (por defecto 30). El **canje** mantiene su propia ventana de 90 segundos contra el doble toque. *(Decisión 2026-09-24: antes eran 90 s para ambos.)*

### 5.5 Actualización de la billetera (push)
- Apple: endpoints de registro de dispositivo del protocolo PassKit (`/v1/devices/...`) + APNs para disparar la relectura del pase.
- Google: actualización del objeto vía Wallet API.
- Disparar en cada cambio del saldo (`activeStamps`) y al desbloquear premio.
- **El push no debe bloquear la respuesta de `/api/scan`.** El cajero no puede esperar a APNs: encolar o ejecutar en background y responder de inmediato.
- Cuidado con el ruido: con sellos que vencen, el saldo también **baja solo**, y cada caída dispara una actualización del pase. Leer §7.7 antes de conectar el push a cada cambio.

### 5.6 Invitar meseros `STAFF` (tarea nueva, **asignada a Dev 1**)
*(Nueva 2026-09-20 — decisión 4.)*

> ✅ **Hecho (PR #9):** `POST /api/merchants/:merchantId/staff/invite`, solo para `OWNER`. Sin `password` invita por email (`inviteUserByEmail`); con `password` crea el usuario directamente. **Falta la UI en el panel** — la tiene Dev 3 (§3.2). *(2026-09-24: la membresía `STAFF` la crea este endpoint con la `service_role key`; el trigger ya no la deriva de la metadata.)*

- Invitar un usuario `STAFF` exige la **`service_role key`** (Supabase Admin API), así que **no se puede hacer desde el frontend con la `anon key`**. Hace falta **un endpoint de backend** para crear/invitar usuarios `STAFF` de un comercio.
- Ese endpoint **setea `merchant_id` y `role` en la metadata del usuario nuevo** — de ahí lo lee el trigger `handle_new_user` para no crearle un `Merchant` propio (§2).
- ~~Hasta que exista, las filas de `MerchantUser` se crean a mano~~ — ya no hace falta: usar el endpoint o el seed (§9).

### 5.7 Definition of Done (Dev 1)
*(Revisado 2026-09-24.)*
- [x] DTOs validados en todos los endpoints.
- [x] Swagger publicado en `/api/docs`.
- [x] Tests de Vitest sobre la lógica de sellado, incluyendo el borde `activeStamps == targetStamps` y el doble escaneo (ahora, el bloqueo de 30 min).
- [ ] **Test del vencimiento:** un sello con `expiresAt` pasado no cuenta en el saldo; uno con `expiresAt` NULL nunca vence. *Parcial: está cubierto que `stampValidityDays = null` deja `expiresAt` en NULL, pero el filtro de vencidos solo se prueba con Prisma mockeado. Falta un test contra una BD real.*
- [x] **Test del FIFO:** al canjear se consumen los sellos más antiguos, no los últimos.
- [ ] **Test de no-retroactividad:** cambiar `stampValidityDays` en el comercio no mueve el `expiresAt` de sellos ya entregados.
- [x] **`/api/scan` graba `createdByUserId`** en `Scan` y en `Stamp`.
- [x] **Endpoint de invitación de `STAFF` (§5.6)** funcionando con `service_role key`, y esa key **nunca** expuesta al frontend.
- [x] `lint`, `typecheck`, `test` y `build` en verde (lint solo con advertencias `unbound-method` en los specs).
- [ ] **Emisión real** con certificados de Apple y Google, probada en teléfonos (§7.3).
- [ ] **Push de actualización** real (§5.5).

### 5.8 Reportería y analítica del dueño (tarea nueva, **asignada a Dev 1**)
*(Nueva 2026-09-30 — decisión 9.)*

**Por qué importa:** el §1.3 dice que lo que el dueño compra son "clientes que vuelven, base de datos propia y métricas", y el §1.4 mide el éxito con "≥ 1 sesión/semana en el panel". La reportería es lo que justifica los planes pagados: "Métricas avanzadas" y "Reportes exportables a Excel" son lo que separa la prueba gratis de los planes Inicial, Pro y Negocio (§6.5).

**Dónde vive:** módulo `reports` en NestJS. Las agregaciones corren en el backend con Prisma (`$queryRaw` donde haga falta) y **no desde el navegador**. El panel las pide con `authenticatedFetch`.

**Contrato** (todas son `GET`, solo `OWNER` de la marca; un `STAFF` recibe 403):

| Endpoint | Devuelve |
|---|---|
| `/api/brands/:brandId/reports/overview` | KPIs del rango comparados con el periodo anterior: clientes nuevos, clientes activos, sellos dados, canjes, tasa de recurrencia y sellos vencidos |
| `/api/brands/:brandId/reports/retention` | Nuevos vs. recurrentes por semana, distribución de frecuencia (1, 2–3, 4+ visitas), **clientes dormidos** (sin visita hace `dormantDays`, por defecto 30) y **cohortes** por mes de alta (% que vuelve el mes 1, 2 y 3) |
| `/api/brands/:brandId/reports/promotions` | Por promoción: canjes (`Scan.promotionId`), días promedio desde el primer sello hasta el canje y **breakage**, que es la cantidad de sellos vencidos sin consumir (`expiresAt < now()` y `consumedAt IS NULL`) |
| `/api/brands/:brandId/reports/locations` | Sellos, canjes y clientes únicos por local, y **heatmap día × hora** en hora local |
| `/api/brands/:brandId/reports/staff` | Por mesero: sellos, canjes, % `MANUAL` y alertas |
| `/api/brands/:brandId/reports/export?report=<nombre>&format=xlsx` | El mismo reporte en `.xlsx` |

**Parámetros comunes:** `from` y `to` (ISO date, **máximo 366 días**), `locationId?` y `tz` (por defecto `America/Santiago`; todo agrupamiento por día u hora se hace en esa zona, **nunca en UTC**).

**Alertas antifraude iniciales** (heurísticas, para ajustarlas con datos del piloto):
1. Un mismo mesero le da **≥ 4 sellos al mismo cliente en 7 días**.
2. Un mesero con **> 50% de sellos `MANUAL`** en el rango, con un mínimo de 20 sellos.
3. Un mesero que sella **y** canjea el mismo pase en menos de 24 h con saldo que no existía al inicio del día.

Cada alerta trae mesero, cliente enmascarado, conteo y el rango, pero **no acusa**: es una señal para que el dueño mire.

**Reglas:**
- El saldo y el vencimiento se calculan con la misma lógica de `PassStampBalance` (§5.4, regla 7); no se inventa un segundo cálculo.
- **Antes de la migración de Dev 3**, `brandId` = `merchantId` y `locationId` se ignora. El backfill de §11.2 hace que ese supuesto siga siendo cierto para los datos antiguos.
- **Gating por plan:** "Métricas básicas" (prueba gratis) = `overview`; "avanzadas" = el resto, y exportar solo desde el plan Inicial. Se diseña el chequeo (`plan.features.advancedMetrics`, `plan.features.excelExport`, §6.5), pero **no se bloquea hasta que exista una suscripción real** (§8.11).
- Clientes enmascarados en todas las respuestas (`12.***.*78-5`), igual que en `/api/scan`.
- El frontend separa **`/admin/analytics`** (gráficos) de **`/admin/reports`** (tablas con filtros y botón de exportar). El dashboard actual sigue con su consulta directa a Supabase hasta que se migre a `overview`.

**DoD (Dev 1, reportería):**
- [ ] Tests de cada agregación contra datos del seed con resultados conocidos, incluidos los bordes de zona horaria (un sello a las 23:30 de Santiago cae en el día correcto).
- [ ] Un `STAFF`, un `OWNER` de otra marca y un usuario sin sesión reciben 403/401 en cada endpoint.
- [ ] `overview` responde en < 500 ms con 50.000 escaneos en el seed de carga.
- [ ] El `.xlsx` abre en Excel y en Google Sheets, con fechas en hora local.
- [ ] Swagger actualizado.

---

## 6. Dev 2 — PWA del cajero y experiencia del cliente

**Objetivo:** las dos superficies donde el producto se gana o se pierde en la calle. Ambas viven dentro de `apps/frontend`; el mapa de rutas completo está en §2.

### 6.1 PWA de escaneo — ruta `/scan` dentro de `apps/frontend`
> ⚠️ **Cambio 2026-09-20 (decisión 3):** la versión anterior de este documento mandaba crear `apps/scanner` como app nueva del monorepo. **Eso queda sin efecto.** La PWA del cajero se construye **dentro de `apps/frontend`, en la ruta `/scan`**. *(2026-09-24: ya no es un placeholder; está implementada y conectada al backend. Lo pendiente está en §3.2.)*

- App liviana instalable (manifest + service worker), pensada para **tablet o teléfono en el mesón**, orientación vertical, uso con una mano.
- Escaneo con `@zxing/library` o `html5-qrcode`. Objetivo duro: **< 2 s desde apuntar hasta confirmación**.
- 🔴 **Sesión del cajero (cambio grande, decisión 4): la PWA YA NO es una pantalla sin login.** El mesero tiene cuenta propia (`STAFF`) y necesita sesión de Supabase. Eso implica:
  - Login propio en `/scan` y **sesión persistente**: el cajero no puede escribir contraseñas en hora punta.
  - **Manejo de refresh de token y de expiración en un celular que vive con la pantalla abierta todo el turno.** Un token vencido a las nueve de la noche no puede traducirse en "se cayó el sistema".
  - Un `OWNER` también puede usar `/scan`; un `STAFF` que intente entrar a `/admin/*` se redirige acá.
- El `STAFF` tiene **solo lectura** sobre los datos del comercio: puede ver el saldo de sellos del cliente, no editar promociones ni configuración. **Ese permiso se aplica en RLS**, no escondiendo botones.
- Estados en pantalla, con contraste altísimo y feedback sonoro/háptico:
  - ✅ **Sello agregado** — mostrar `4 / 5` en grande.
  - 🎉 **Premio desbloqueado** — pantalla distinta, obliga al cajero a confirmar el canje.
  - ⚠️ **Pase de otro local / inválido** — rojo, inequívoco.
  - 🔁 **Ya escaneado recién** — amarillo, evita el doble timbre.
- **Fallback manual obligatorio:** pantalla para buscar por RUT o teléfono cuando la cámara falla (permiso denegado, poca luz, pantalla rota del cliente). No es opcional: es la diferencia entre "se cayó el sistema" y "seguimos atendiendo".
- Comportamiento offline mínimo: si se cae la red, avisar claramente en vez de fallar en silencio. Lo mismo vale para la sesión: distinguir "sin internet" de "sesión vencida, volvé a entrar".

### 6.2 Landing de adquisición `/join/:merchantName`
Flujo completo en una sola pantalla, sin scroll innecesario:
1. El cliente escanea el QR físico de la mesa y aterriza aquí.
2. Ve el nombre del local y la promoción vigente ("Junta 5 sellos, llévate un café").
3. Ingresa RUT **y** teléfono (los dos obligatorios) y acepta los términos → `POST /api/customers`.
4. Aparecen los botones oficiales **"Add to Apple Wallet"** / **"Add to Google Wallet"** (usar los badges oficiales; Apple y Google tienen guías de marca estrictas).
5. Detectar plataforma: mostrar primero el botón de la billetera del dispositivo.
6. Pantalla de confirmación con instrucción explícita de qué hacer en la próxima visita.

**Requisitos no negociables del landing:** carga rápida en 4G, cero login, cero contraseñas, mobile-first, texto legible sin zoom y una línea sobre el tratamiento de datos personales (§7.2).

**Decisión importante (URL vs DB):** El slug o nombre del local va en la URL (`/join/:merchantName`) por usabilidad, SEO y confianza del cliente final, pero toda escritura en la base de datos (como la emisión del pase) sigue usando estrictamente el `merchantId` (UUID) para evitar colisiones y por seguridad. El frontend es responsable de consultar un endpoint público para resolver el nombre de la URL y obtener el `merchantId` real antes de iniciar la emisión.

Si el comercio tiene `stampValidityDays`, **decirlo acá** en lenguaje humano ("tus sellos valen 3 meses"). Enterarse del vencimiento cuando el contador ya bajó es la peor forma de enterarse (§7.7).

### 6.3 Definition of Done (Dev 2)
*(Revisado 2026-09-24.)*
- [ ] Probado en **iOS Safari y Android Chrome reales**, no solo en el emulador de escritorio — los permisos de cámara se comportan distinto. *Hay que re-probar tras los cambios del 2026-09-24 a `QRCam.tsx`.*
- [x] Tests de los componentes críticos, lint/typecheck en verde.
- [ ] PWA instalable verificada. *Configurada (PR #12: manifiesto, íconos y service worker con `vite-plugin-pwa`). Falta verificar la instalación en un iPhone y un Android reales.*
- [x] **El scanner vive en `apps/frontend` bajo `/scan`** — no se agregó ninguna app nueva al monorepo.
- [ ] **Login del cajero funcionando**, con sesión persistente y **refresh de token probado tras varias horas con la pantalla abierta**. *Login, sesión persistente y refresh automático en `visibilitychange` + reintento en 401 funcionan (PR #12); falta la prueba de varias horas en un dispositivo real.*
- [x] **Sesión vencida y caída de red se muestran distinto** (PR #12: `useOnlineStatus` + "Tu sesión venció"), y ninguna de las dos deja la pantalla en blanco.
- [x] Un `STAFF` que entra a `/admin/*` termina en `/scan` (y no en una pantalla rota).
- [x] La pantalla del cajero lee el saldo de la respuesta de `/api/scan` (`activeStamps`), **nunca de `Pass.stampsCount`** (ya no existe).
- [x] Fallback manual por RUT/teléfono funcionando contra el backend.
- [x] Landing `/join/:merchantName` conectada al backend, con vigencia y aviso de datos personales.
- [x] Badges oficiales de Apple/Google Wallet en la confirmación (PR #12).

### 6.4 Equipo — `/admin/team` (tarea nueva, **asignada a Dev 2, full-stack**)
*(Nueva 2026-09-30. Antes era la tarea "UI para invitar, listar y dar de baja meseros" del Dev 3 anterior.)*

Dev 2 hace **el backend y la UI** dentro del módulo `staff` que ya existe (`apps/backend/src/staff`). Dev 1 revisa el PR. Todo es solo para el `OWNER`, y la `service_role key` sigue viviendo **solo en el backend** (§7.5).

**Contrato** (rutas por marca; hasta la migración de Dev 3, `brandId` = `merchantId` y `locationId` es opcional):

```jsonc
// GET /api/brands/:brandId/staff
[{ "userId": "uuid", "email": "cajero1@example.com", "role": "STAFF",
   "locationId": "uuid", "locationName": "Café Demo — Providencia",
   "status": "INVITED" | "ACTIVE",          // ACTIVE = ya entró alguna vez (last_sign_in_at)
   "invitedAt": "…", "lastSignInAt": "…" | null }]

// POST /api/brands/:brandId/staff/invite        (el endpoint actual, más locationId)
{ "email": "…", "locationId": "uuid", "password": "…" /* opcional, igual que hoy */ }

// POST /api/brands/:brandId/staff/:userId/resend-invite   → 204 (solo si status = INVITED)
// PATCH /api/brands/:brandId/staff/:userId      { "locationId": "uuid" }   → reasignar de local
// DELETE /api/brands/:brandId/staff/:userId     → 204
```

**Reglas:**
- El `OWNER` aparece en la lista, pero **no se puede dar de baja ni reasignar**, y nadie puede darse de baja a sí mismo (400).
- **Dar de baja borra la membresía.** Si el usuario no tiene otra membresía, además se **banea** en Supabase Auth (`ban_duration`) para invalidar sus refresh tokens. Como el access token vive hasta ~1 h, el corte inmediato lo dan el guard del backend (que ya valida la membresía en cada `/api/scan`) y el RLS. **Verificar con un test** que un mesero dado de baja recibe 403 en el siguiente escaneo.
- La baja queda en `AuditLog` cuando exista (§4.1).
- Límite del plan (§6.5): la UI muestra "N de M usuarios" y avisa al llegar al límite. **El backend no lo bloquea todavía** (§8.11).

**UI:** tabla con correo, local, estado y último ingreso; modal de invitación (correo + local); acciones con `ConfirmDialog`. En móvil se ve como tarjetas.

### 6.5 Mockup de Facturación — `/admin/billing` (tarea nueva, **Dev 2**)
*(Nueva 2026-09-30.)*

**Es un mockup:** datos simulados, sin proveedor de pago ni boletas reales. Vive detrás de **`VITE_FEATURE_BILLING=true`**: sin la variable la ruta y el ítem del menú no existen, para que nadie lo vea en producción como si fuera real.

**Catálogo de planes** — constante tipada en `packages/shared` (`plans.ts`), única fuente para Dev 1 (gating), Dev 2 (UI) y Dev 3 (`/internal`). Precios de referencia, **no cerrados** (§8.11):

| `PlanId` | Nombre | Precio (USD/mes) | Anual (USD/mes) | Programas | Sucursales | Usuarios de equipo | Clientes | Extras |
|---|---|---|---|---|---|---|---|---|
| `TRIAL` | Prueba gratis | 0 · 30 días, sin tarjeta | — | 1 | 1 | 1 | 100 | Apple/Google Wallet, métricas básicas |
| `STARTER` | Inicial | 14 | 11 | 3 | 2 | 3 | Ilimitados | + push, notificaciones por ubicación, métricas avanzadas, exportar a Excel |
| `PRO` | Pro · *Popular* | 24 | 19 | 8 | 8 | 15 | Ilimitados | ídem |
| `BUSINESS` | Negocio | 39 | 29 | 15 | 15 | 25 | Ilimitados | ídem |

```ts
// packages/shared/src/plans.ts
export type PlanId = 'TRIAL' | 'STARTER' | 'PRO' | 'BUSINESS';
export interface Plan {
  id: PlanId; name: string; tagline: string; highlighted?: boolean;
  priceUsdMonthly: number; priceUsdMonthlyAnnual: number | null; trialDays?: number;
  limits: { programs: number; locations: number; teamUsers: number; customers: number | null }; // null = ilimitado
  features: { walletPasses: true; pushNotifications: boolean; geoNotifications: boolean;
              advancedMetrics: boolean; excelExport: boolean };
}
export interface SubscriptionMock {
  planId: PlanId; status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  billingCycle: 'MONTHLY' | 'ANNUAL'; trialEndsAt: string | null; currentPeriodEnd: string;
  usage: { programs: number; locations: number; teamUsers: number; customers: number }; // uso real, leído del backend
}
```

**Pantalla:**
1. **Plan actual**: nombre, estado, renovación o días de prueba restantes y barras de uso contra límites (el uso sí es real: locales, meseros y clientes de la marca).
2. **Los 4 planes** en tarjetas, con toggle mensual/anual. Texto aclaratorio: *"Cada programa de lealtad es una tarjeta distinta en tu panel. El límite es de programas activos; tus clientes son ilimitados desde el plan Inicial."*
3. **Historial de boletas** simulado (fecha, monto, estado, "Descargar" deshabilitado).
4. Botones "Cambiar plan" y "Suscribirme" **deshabilitados** con el tooltip "Próximamente".

**Banner de prueba** en el layout de `/admin/*`: *"Estás en periodo de prueba — te quedan N días"* + botón "Suscribirme" → `/admin/billing`. Solo con el flag activo.

> ⚠️ Las capturas de referencia que se usaron para definir planes y soporte son de otro producto. **Se toma la estructura, no la marca:** ni textos literales, ni ilustraciones, ni correos de contacto ajenos.

### 6.6 Mockup de Soporte — `/admin/support` (tarea nueva, **Dev 2**)
*(Nueva 2026-09-30. El contrato de datos es de Dev 3, §11.4.)*

**Pantalla** (dos columnas en escritorio, una en móvil):
- **Formulario "¿Necesitas ayuda?"**:
  - **Categoría** (obligatoria, `TicketCategory`, §11.4) con el texto de ayuda "Elige la más cercana".
  - **Describe tu problema** (obligatorio, 20–5000 caracteres), con el placeholder "Cuéntanos qué pasó, en qué pantalla y qué esperabas que sucediera".
  - **Local** (opcional, selector de las sucursales de la marca).
  - **Teléfono** (opcional): selector de país con **+56 por defecto** y validación E.164. Aquí no se reutiliza `PhoneField`, que tiene +56 fijo. Texto de ayuda: "Déjanos tu número si prefieres que te contactemos por teléfono o WhatsApp".
  - **Adjuntar captura** (opcional): PNG o JPG, hasta 10 MB, con vista previa y opción de quitarla.
  - Botón **"Enviar solicitud"**, deshabilitado hasta que el formulario sea válido. Al enviar muestra un toast con el número del ticket.
- **Tarjeta "Estamos para ayudarte"**: "Tu mensaje llega directo a una persona de nuestro equipo".
- **"Otras formas de contacto"**: correo (`VITE_SUPPORT_EMAIL`, `mailto:`) y WhatsApp (`VITE_SUPPORT_WHATSAPP`, `https://wa.me/<número>`).
- **"Mis solicitudes"**: lista con `#número`, categoría, estado (badge de color), fecha y última respuesta. El detalle muestra el hilo, **sin las notas internas**, y una caja para responder. Responder un ticket `RESOLVED` lo reabre.

**Cómo se conecta después:** Dev 2 escribe `services/supportService.ts` con **la misma firma que los endpoints de §11.4**, pero con un adaptador en memoria que simula latencia y la numeración de tickets. Cuando Dev 3 publique la API, se cambia solo el adaptador, sin tocar componentes. Se testea como el resto del frontend: sin `vi.fn`, con el adaptador en memoria.

---

## 7. Riesgos y bloqueantes

### 7.1 🟠 RLS: ya existe, pero la que importa es la de membresía
*(Era 🔴 "No hay Row Level Security en la base". Se corrigió: `20260920041500_harden_rls_and_trigger` activó RLS en todas las tablas y `20260921010000_stamps_with_expiry` la extendió a `Stamp`.)*

El panel admin consulta Supabase **directamente con la `anon key`** y filtra por `merchantId` **en el cliente**, así que **el RLS es la única barrera real**: sin políticas, cualquier comercio autenticado podía, cambiando un UUID en una petición, leer o modificar datos de otro — clientes, pases y escaneos incluidos. Eso ya está cerrado.

Lo que queda abierto es más fino y más caro: **las políticas originales eran `"merchantId" = auth.uid()`, y eso se rompe con más de un usuario por comercio** (decisión 4). La reescritura contra la membresía ya está en la rama (`20260921020000_merchant_users_and_roles`): funciones `SECURITY DEFINER STABLE` con `search_path` fijo (`current_merchant_ids()`, `is_merchant_owner()`), **SELECT para cualquier miembro, INSERT/UPDATE/DELETE solo para `OWNER`**. **Hay que aplicar esa migración** (`prisma migrate dev`) antes de probar cualquier cosa con dos usuarios: hasta entonces un `STAFF` no tiene acceso correcto a nada. La `service_role key` queda reservada **exclusivamente para el backend**. Responsable: **Dev 3**, pero afecta a los tres. Bloqueante antes del primer piloto con un local real.

**Bug concreto que esto destapó y ya se corrigió:** el trigger `handle_new_user` creaba un `Merchant` por **cada** usuario nuevo de `auth.users`, así que **el primer mesero invitado se habría auto-creado su propio local**. Ahora distingue por el `merchant_id` que viene en `raw_user_meta_data`.

**Escalada de privilegios corregida el 2026-09-24 (revisión del PR #11):** el trigger además **creaba la membresía** con el `role` que venía en esa metadata. Como la metadata la escribe el cliente en `supabase.auth.signUp({ options: { data } })` con la anon key, cualquiera podía registrarse como `OWNER` de cualquier local, y el `merchantId` se obtiene del endpoint público `by-slug`. Se comprobó en local. Desde `20260924190000` el trigger no crea membresías desde metadata y la membresía `STAFF` la inserta el backend. **Regla: `raw_user_meta_data` nunca decide permisos.**

### 7.2 🟠 Datos personales (Ley 19.628 / RUT)
Estamos guardando RUT y teléfono de clientes finales. Hace falta, como mínimo: aviso de privacidad en el landing, propósito declarado y una vía para solicitar borrado.
*Estado 2026-09-24:* hay aviso en el landing, términos en `/terminos` con el propósito, los datos tratados y los derechos del titular, y **consentimiento expreso registrado** (checkbox obligatorio + `Customer.termsAcceptedAt` / `termsVersion`). ~~Falta el proceso real de borrado~~ — *hecho en el PR #13* (`DELETE /api/customers/:customerId`, §3.1). Falta la revisión legal del texto (§3.2, Equipo). *2026-09-30:* con el panel interno (§11), **nuestro propio equipo accede a datos de clientes de todas las marcas**, así que el enmascarado y el `AuditLog` son obligatorios (§11.5). Evitar exponer el RUT completo en la pantalla del cajero (mostrar solo los últimos dígitos, como en §5.4).

### 7.3 🟠 Certificados Apple / Google (bloqueante para Dev 1)
`passkit-generator` necesita certificados reales de una cuenta **Apple Developer (USD 99/año)**: Pass Type ID, `.p12` y certificado WWDR. Google Wallet requiere una Service Account de Google Cloud y el alta del Issuer. Sin esto no se puede probar la emisión real ni APNs.
*Mitigación:* arrancar con pases estáticos de prueba y una interfaz `PassProvider` que permita cambiar la implementación después, para que el resto del flujo (`/api/scan`, PWA, landing) avance en paralelo. Los push quedan bloqueados igual.
*Estado 2026-09-30:* **Google ya tiene la base** (PR #13): con las credenciales del Issuer, el backend firma el link de guardado. Faltan la personalización del pase (próximo sprint), probarlo en un Android real, las credenciales de **Apple** y el push de ambos.
*Estado 2026-09-24:* **sigue abierto; es el bloqueante número uno para producción.** Mientras tanto, `ALLOW_MOCK_PASSES=true` en `apps/backend/.env` deja emitir pases de prueba y el resto del flujo funciona completo. En modo mock el cliente no tiene cómo ver su QR: para probar, el cajero usa el ingreso manual o un QR generado a mano (§9).

### 7.4 🟡 Latencia y permisos de cámara en navegador
El escaneo depende de Safari/Chrome, del permiso de cámara y de la luz del local; puede ser más lento que una app nativa.
*Mitigación:* contraste UI fuerte, encuadre guiado y fallback por RUT bien probado. Medir el tiempo real en un local, no en la oficina.

### 7.5 🟡 Gestión de secretos
Hoy los `.env` viven solo en local (están en `.gitignore`, correcto). Ya hay `.env.example` versionado en `apps/backend` y `apps/frontend`. Falta un lugar acordado para las llaves de producción antes del despliegue. Con el endpoint de invitación de meseros (§5.6) entra la **`service_role key`** al backend: esa nunca puede terminar en el bundle del frontend.

### 7.6 ✅ Resuelto: este archivo ya viaja en el repositorio
*(Cerrado el 2026-09-21, a pedido de la revisión del PR #7.)* `HANDOFF.md` estaba en `.gitignore`, así que las decisiones de arquitectura no le llegaban a Dev 1 ni a Dev 2 por `git pull`. Se quitó del `.gitignore` y el documento se versiona junto al código: a partir de ahora, quien cambie un contrato que está acá lo actualiza en el mismo PR.

### 7.7 🟠 El contador del cliente **baja solo** — riesgo de producto, no técnico
*(Nuevo 2026-09-20. Riesgo asumido y explícito de la decisión 1.)*

Con sellos que vencen y consumo FIFO, el saldo del cliente **disminuye sin que él haga nada**. Y como el pase de la billetera se actualiza por push, **cada caída dispara una actualización del pase que el cliente lee como un castigo**: "me sacaron un sello". Es exactamente lo contrario de la sensación que vende el producto.

*Mitigación:*
- **Avisar antes de que venza, no después.** `PassStampBalance.nextExpiryAt` existe justamente para eso.
- Evitar **push ruidosos**: no notificar cada vencimiento individual ni cada recálculo. Un aviso anticipado y bien redactado, no un goteo.
- Decir la vigencia **desde el principio**, en el landing de emisión y en el pase (§6.2).
- Con `stampValidityDays = null` el problema no existe: es la salida si un local no lo quiere.

No lo escondemos: es el costo consciente de que los sellos generen urgencia. El detalle del aviso sigue sin definir — §8.8.

### 7.8 ✅ Resuelto: el panel ya consume el `merchantId` de la membresía
*(Cerrado el 2026-09-21, a pedido de la revisión del PR #7.)* Las páginas del panel filtraban por `session.user.id` dando por sentado que era el `merchantId`. Ahora `App` resuelve la membresía una sola vez y le pasa `merchantId` como prop a `Dashboard`, `PromotionsModule`, `Customers` y `Settings`; ninguna página deriva ya el comercio del id del usuario. La igualdad `Merchant.id = auth.users.id` sigue existiendo para el `OWNER`, pero el panel dejó de depender de ella.

### 7.9 🟠 La sesión del cajero es un punto de falla nuevo
*(Nuevo 2026-09-20.)* Agregar login a la PWA del cajero agrega una forma nueva de que la caja "se caiga": token vencido, refresh fallido, logout accidental en hora punta. Antes esa pantalla no podía fallar por auth porque no tenía auth. Dev 2 tiene que tratar la expiración de sesión como un caso de UX de primera clase (§6.1), no como un error genérico.
*Estado 2026-09-30:* mitigado en el PR #12 (refresh en `visibilitychange`, reintento en 401 y `useOnlineStatus`). Falta la prueba de varias horas en un dispositivo real.

### 7.10 🟠 El panel interno ve TODO — y vive en el mismo bundle que la landing
*(Nuevo 2026-09-30 — decisión 8.)* `/internal/*` accede a datos de todas las marcas. Se decidió hacerlo dentro de `apps/frontend` y no en una app aparte, así que hay que cumplir tres cosas sin excepción:
- **El RLS no protege acá:** un `PlatformAdmin` no tiene membresía. **Todo** dato de `/internal` sale de `/api/internal/*`, protegido por `PlatformAdminGuard`, que valida contra la tabla `PlatformAdmin` en cada request. **Nunca se agregan políticas RLS para "admins"**: una política mal escrita abriría todas las marcas a cualquier `authenticated`.
- **Esconder la ruta no es seguridad.** Las páginas se cargan con `React.lazy`, lo que mantiene el código fuera del bundle principal y reduce superficie, pero la barrera real es el backend.
- **Cada escritura y cada vista de un dato personal completo quedan en `AuditLog`**, con el motivo cuando corresponde. Sin auditoría no se hace el merge.

### 7.11 🔴 La migración `Brand > Location` toca todo al mismo tiempo
*(Nuevo 2026-09-30 — decisión 5.)* Cambia la llave del `Pass`, reescribe el RLS y el trigger, y mueve `stampValidityDays`. Si se hace en paralelo con los módulos nuevos de Dev 1 y Dev 2, los PR van a chocar.
*Mitigación:*
- La hace **un solo dev (Dev 3), en un solo PR**, que Dev 1 revisa.
- **Conserva los IDs:** `Location.id` = `Merchant.id` y `slug` sin cambios, para que no se rompan los QR impresos, los `Scan` ni las rutas nuevas.
- Por cada `Merchant` existente, el backfill crea una `Brand`, un `LoyaltyProgram` `STAMPS` con su `stampValidityDays` y mueve sus `Pass` al programa.
- El PR incluye **pruebas del SQL contra una BD real** (RLS con `OWNER`, `STAFF` de otro local y otra marca) y el flujo completo del §9 repetido **sellando en un local y canjeando en otro**.
- Una vez mergeado, avisar al equipo: `prisma generate` + `migrate dev` + seed nuevo (§9).

---

## 8. Dudas abiertas — decidir en equipo antes de codificar lo afectado

### 8.1 Token estático vs. dinámico
Apple Wallet permite un QR estático por pase. ¿Usamos un `passToken` fijo por cliente (simple, funciona con el pase offline, pero una foto del QR es reutilizable) o lo rotamos (más seguro, exige que el pase se actualice contra el servidor)?
**Impacta:** la validación en `/api/scan` (Dev 1) y la ventana anti-doble-escaneo.
**Recomendación para el MVP:** token estático + ventana de 90 s + registro completo en `Scan`. El fraude posible (un amigo usando tu QR) es de valor económico bajísimo.
*Nota 2026-09-24:* hoy se usa token estático, y la ventana para sellos subió a **30 minutos por pase** (QR y manual) para que un cliente no acumule varios sellos en una misma visita (§5.4). Falta confirmar en equipo que esta es la política del MVP.

### 8.2 ✅ DECIDIDA (2026-09-24) — ¿Cómo se relaciona un `Pass` con una `Promotion`?
**Decisión: varias promociones activas y un saldo único de sellos por pase.** Ninguna de las dos opciones de abajo:
- El dueño puede tener **varias promociones activas a la vez**.
- **Los sellos no pertenecen a ninguna promoción:** son saldo del pase. Todo sello vigente sirve para cualquier promoción activa.
- **El cliente elige en caja** en cuál gastarlos, entre las que su saldo alcanza. También puede no canjear y seguir juntando para una más cara.
- El canje consume FIFO **solo los `targetStamps` de la promoción elegida**; el resto sigue vivo, con su vencimiento original.
- **La landing y el pase destacan la promoción activa más reciente** y avisan que los sellos también sirven para las demás mientras estén vigentes.

**Implementación:** §5.4 (reglas 2 a 6 y contrato), `Scan.promotionId` para saber qué se canjeó, `activePromotions` en `GET /api/merchants/by-slug/:slug` y la pantalla de elección de premio en `/scan`.
**Consecuencia para producto:** desactivar una promoción no le quita sellos a nadie; solo deja de ofrecerse como canje.

*(Texto original, abierta 2026-09-20:)*
Hoy `Pass` **no tiene `promotionId`**, pero `Promotion` permite varias promociones activas simultáneas por comercio. Cuando llega un escaneo, el backend no tiene forma determinista de saber **qué promoción aplica**.
**Opciones:** (a) restringir a una sola promoción activa por comercio (índice único parcial + validación en el panel), más simple y alineado al MVP; (b) agregar `promotionId` a `Pass` y emitir un pase por promoción, lo que obliga a revisar el `@@unique([customerId, merchantId])`.
**Recomendación:** (a) para el MVP. **Decisión bloqueante para Dev 1.**
*Estado previo a la decisión (2026-09-24):* el backend exigía `promotionId` cuando había más de una promoción activa, la PWA no lo enviaba y con dos promociones activas todo escaneo respondía 400. **Corregido.**
*Nota 2026-09-20:* `Stamp.promotionId` registra a qué promoción se atribuyó cada sello, pero **no decide cuál aplica** en el momento del escaneo: la duda sigue abierta.

### 8.3 ✅ DECIDIDA (2026-09-20) — Flujo post-canje
**La duda era:** tras `REWARD_REDEEMED`, ¿el contador vuelve a 0 y el ciclo es infinito, o el pase se marca como completado/expirado?
**Decisión:** **ciclo infinito**, que es lo que maximiza retención — justamente lo que le vendemos al local. **Pero el reset ya no es `stampsCount = 0`**: esa columna no existe. El canje **marca como consumidos los `targetStamps` sellos activos más antiguos** (FIFO), con `consumedAt` + `consumedByScanId`. Los sellos sobrantes **siguen vivos y cuentan para el próximo premio**, con su `expiresAt` original. El historial completo queda en `Scan` y en `Stamp`, así que no se pierde información.
**Implementación:** §5.4, regla 6.

### 8.4 ✅ DECIDIDA (2026-09-20 roles · 2026-09-30 multi-local) — Roles y multi-local
**Actualización 2026-09-30 (decisiones 5 a 7): el multi-local ENTRA.** Modelo `Brand > Location`, con el saldo de sellos **por marca** (se sella en A y se canjea en B), `OWNER` a nivel de marca y `STAFF` a nivel de local. El `Merchant` de hoy se convierte en `Location` conservando `id` y `slug`. Detalle en §4.1 y §11.2. Queda abierta una sola cosa: que cada marca pueda elegir saldo por local (`LoyaltyProgram.scope = LOCATION`), que existe en el modelo pero no se implementa.

*(Texto de la decisión del 2026-09-20:)*
**La duda era:** la BD asume **1 Merchant = 1 panel = 1 caja**, y los roles quedaban fuera del MVP.
**Decisión — lo que ENTRA:** **roles dentro de un mismo comercio, ya en el MVP.** Tabla `MerchantUser` (`userId`, `merchantId`, `role`) con dos roles reales: `OWNER` (acceso completo al panel y a la configuración) y `STAFF` (solo lectura del saldo de sellos + el scanner). Es un cambio caro y no cosmético: hasta hoy `Merchant.id === auth.users.id` y **todas** las políticas RLS eran `"merchantId" = auth.uid()`, lo que se rompe con más de un usuario por comercio. Ver §7.1.
**Decisión — lo que SIGUE FUERA:** **multi-local / franquicias.** Si "Cafetería X" tiene 3 locales, hoy sigue necesitando 3 cuentas separadas y las métricas no se consolidan. Cuando entre, el modelo sería `Brand > Location` y toca migración de datos. No diseñar para eso ahora, pero **no cerrar la puerta**: evitar suposiciones de "un merchant es un lugar físico" en el código nuevo. La PK compuesta de `MerchantUser` ya permite, estructuralmente, que un usuario pertenezca a varios comercios.

### 8.5 Sellos manuales y correcciones
¿Puede el cajero agregar un sello sin escanear, o anular uno mal dado? Hoy no está contemplado y `Scan` es append-only. Probablemente haga falta en el primer piloto real.
*Nota 2026-09-20:* con `Stamp` como entidad propia, "anular" tiene ahora una forma natural (marcar el sello), pero **quién puede hacerlo no está decidido**: el `STAFF` es solo lectura, así que hoy la corrección solo podría venir del `OWNER` o del backend. Se cruza con §8.7.

### 8.6 ✅ RESUELTA EN LA PRÁCTICA (2026-09-24) — Landing pública `/`
Ya existe (`pages/public/Home.tsx`, PR #10). Sigue sin decidirse **cuándo** se mueve a un sitio estático prerenderizado.
*(Texto original, abierta 2026-09-20:)* La decisión 2 reserva `/` para una **landing estática explicativa pública**, pero no se definió **quién la hace** (Dev 2 tiene las superficies públicas; Dev 3 tiene hoy `apps/frontend`), **qué contenido lleva**, ni **cuándo** se mueve al sitio estático prerenderizado que motivó el prefijo `/admin/*`. Mientras no se decida, `/` no existe.

### 8.7 ✅ RESUELTA POR IMPLEMENTACIÓN (2026-09-24) — ¿Un `STAFF` puede sellar y canjear?
**Sí, por la vía (a):** el `STAFF` sella y canjea solo a través de `/api/scan`. El backend valida la membresía y escribe con Prisma, y el RLS restrictivo sigue intacto. El `STAFF` ve el saldo del cliente dentro de `/scan`, en la respuesta del escaneo.
*(Texto original, abierta 2026-09-20:)* El rol `STAFF` se definió como **solo lectura** del saldo + el scanner, y las políticas RLS dejan INSERT/UPDATE/DELETE **solo para `OWNER`**. Pero escanear **escribe** (`Scan` y `Stamp`). Las dos lecturas posibles:
- (a) El `STAFF` nunca escribe directo contra Supabase: `/api/scan` pasa por el backend, que valida la membresía por su cuenta. El RLS restrictivo queda correcto tal cual.
- (b) Hace falta una política de INSERT acotada para `STAFF` sobre `Scan` y `Stamp`.
**Bloquea a Dev 1** (§5.4) y a Dev 3 (política RLS). Relacionado: si vale (a), **dónde ve el `STAFF` el saldo de un cliente** si no puede entrar a `/admin/*` — se asume que dentro del propio `/scan`, pero no está especificado.

### 8.8 ❓ Aviso de vencimiento: antelación, canal y frecuencia
*(Abierta 2026-09-20.)* Está decidido que **un job programado disparará el push de aviso de vencimiento más adelante** y que hay que **avisar antes, no después** (§7.7). No está decidido: **con cuánta antelación**, **por qué canal** (¿solo la actualización del pase en la billetera?), **cada cuánto** se puede avisar sin volverse ruido, ni **quién lo construye**. Sin esto, la mitigación del riesgo 7.7 es una intención, no un plan.

### 8.9 ✅ RESUELTA (2026-09-24) — Nombre del saldo en el contrato de la API
El contrato usa **`activeStamps`** y expone **`nextExpiryAt`** (§5.4). La PWA lo mapea internamente. Si la pantalla del cajero debe mostrar el vencimiento queda como mejora opcional de Dev 2 (§3.2).
*(Texto original, abierta 2026-09-20:)* La respuesta de `/api/scan` sigue llamando `stampsCount` a un valor que ahora sale de `PassStampBalance.activeStamps`. ¿Se renombra el campo en el contrato (más honesto, rompe lo que Dev 2 ya tenga mockeado) o se mantiene el nombre por compatibilidad? ¿Se expone también `nextExpiryAt` para que el cajero pueda decirle al cliente "te vence un sello el jueves"? Decidir **antes** de publicar el Swagger, que es el contrato entre Dev 1 y Dev 2.

### 8.10 ❓ Otros programas de lealtad: puntos, cashback, cupones, giftcard y membresía
*(Abierta 2026-09-30. La base ya quedó decidida en la decisión 6.)*
**Lo decidido:** existe `LoyaltyProgram` y **cada programa es una tarjeta distinta en la billetera** (`Pass` único por `(customerId, programId)`). Hoy solo se implementa `STAMPS`. Lo confirma el propio pitch de los planes (§6.5): *"cada programa de lealtad es una tarjeta distinta"*, y el límite de cada plan es de programas activos.
**Lo que falta decidir:** en qué orden entran los demás y cómo se modela cada uno. No son todos lo mismo:

| Tipo | Qué es en el fondo | Cómo encaja |
|---|---|---|
| `STAMPS` (sellos/visitas) | Saldo que se gana en entradas append-only y se calcula al leer | ✅ implementado (`Stamp`) |
| `POINTS` | El mismo libro, con monto `N` por compra | Generalizar `Stamp` a un libro con `amount` **cuando entre**, no antes. Exige capturar el monto de la compra en caja |
| `CASHBACK` | Puntos expresados en dinero, canjeables como descuento | Igual que `POINTS`, más reglas de conversión y de canje parcial |
| `COUPON` | Beneficio de uso único, con vigencia | Entidad propia (emitido → usado/vencido), no un saldo |
| `GIFTCARD` | **Dinero prepagado**: se compra, no se gana | ❌ Otro módulo: requiere proveedor de pago, reembolsos, débito exacto y tratamiento contable y tributario. En Google usa `giftCardObject`, no `loyaltyObject` |
| `MEMBERSHIP` | **Un estado con vigencia** (activo de X a Y, con nivel), cobrado en forma recurrente | Entidad propia; se cruza con el cobro recurrente (§8.11) |

**Regla que no cambia para ningún tipo:** todo saldo se calcula al leer a partir de un libro append-only. Nunca un contador que se corrige después (§5.4, regla 7).
**Recomendación:** `POINTS` y `CASHBACK` primero (reutilizan el libro); `COUPON` después; `GIFTCARD` y `MEMBERSHIP` solo cuando exista cobro real.

### 8.11 ❓ Planes y cobro: moneda, impuestos y límites
*(Abierta 2026-09-30.)* El mockup de §6.5 define 4 planes en **USD**. Antes de cobrar de verdad falta decidir:
- ¿USD o CLP? ¿Con IVA incluido? ¿Qué documento tributario se emite?
- El proveedor de pago.
- **Cuándo y dónde se aplican los límites** (programas, sucursales, usuarios, 100 clientes en la prueba). Recomendación: en el backend, al crear un local, invitar a un mesero, activar un programa o dar de alta un cliente, con un error explícito (402/403 con el código `PLAN_LIMIT`) y nunca borrando datos al bajar de plan.
- Qué pasa al vencer la prueba sin suscripción: ¿solo lectura? ¿se deja de sellar? **No puede afectar la tarjeta que ya está en la billetera del cliente final.** *→ Respondido en §8.12: la marca se suspende y queda sin acceso.*

### 8.12 ✅ DECIDIDA (2026-09-30) — Marca suspendida y retención de datos
**Decisión:** una marca suspendida (por no pago, fin de la prueba o abuso; la suspende el equipo interno desde `/internal`) queda **sin acceso**:
- El dueño y los meseros no ven nada en el panel ni en `/scan`, solo el mensaje "Tu cuenta está suspendida" (`SUSPENDED_ACCOUNT_MESSAGE`).
- `/join` responde "local no disponible", no se emiten pases y no se sella ni se canjea.
- **Los datos se conservan** para poder reactivar la marca, y las tarjetas en la billetera del cliente no se invalidan.
- Excepción: el borrado de un cliente por la Ley 19.628 sigue funcionando por backend.
- **Implementado en el PR #16** (RLS + backend + panel).

**Retención a 2 años — ⚠️ pendiente de revisión legal, NO implementar todavía.** La idea es que, si una cuenta suspendida no se reactiva en 2 años, se borre la marca y nos quedemos solo con la base de clientes. El problema es que el cliente final entregó su RUT y su teléfono **para el programa de ese local** (términos §datos personales, Ley 19.628). Conservarlos para nosotros tras la baja del local es un **fin distinto**, que exige:
- que los términos lo digan explícitamente;
- que el cliente lo haya aceptado (subir `TERMS_VERSION`);
- revisarlo contra la Ley 21.719.

Alternativa segura: al cumplirse el plazo, borrar los datos personales y quedarse con datos **anonimizados y agregados** (conteos, frecuencias, métricas). **Responsable: Equipo — legal**, antes de que alguien construya el job.

---

## 9. Puesta en marcha local

```bash
# Requisitos: Node 22+, pnpm 11, Docker Desktop corriendo
pnpm install

# Levanta Supabase local (API :54321, DB :54322, Studio :54323) y todas las apps en paralelo
pnpm run dev

# Base de datos
pnpm --filter backend exec prisma generate        # OJO: correrlo tras cada pull que toque schema.prisma
pnpm --filter backend exec prisma migrate dev     # aplica migraciones
pnpm --filter backend exec prisma studio          # inspeccionar datos
```

> Si `pnpm run dev` falla con `Property 'merchantUser' does not exist on type 'PrismaService'` (o `stamp`, `slug`…), el cliente de Prisma está desactualizado: corre `prisma generate` y reinicia.

**Resetear la base y cargar el seed** (borra todo, incluidos los usuarios de Supabase Auth):
```bash
npx supabase db reset                                        # desde la raíz
cd apps/backend && npx prisma migrate deploy
node --env-file=.env prisma/seed.js
```

**Variables de entorno** (los `.env` no se versionan; copiar el `.env.example` de cada app):
- `apps/frontend/.env` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (por defecto `http://localhost:3000`) y, antes de producción, `VITE_LEGAL_*` (datos de la empresa para `/terminos`).
- `apps/frontend/.env`, nuevas (2026-09-30): `VITE_FEATURE_BILLING` (muestra el mockup de facturación y el banner de prueba, §6.5), `VITE_SUPPORT_EMAIL` y `VITE_SUPPORT_WHATSAPP` (§6.6).
- `apps/backend/.env` → `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `ALLOWED_ORIGINS` (PR #13: orígenes permitidos por CORS, separados por comas).
- Desarrollo sin certificados: **`ALLOW_MOCK_PASSES=true`**. Sin esta variable, `POST /api/customers` responde 500.
- Antifraude: `STAMP_COOLDOWN_MINUTES` (por defecto 30). Para probar localmente sin esperar, usar `1`.
- Soporte: `SUPPORT_AUTOCLOSE_INTERVAL_MINUTES` (por defecto 60; `0` apaga el cierre automático de tickets `RESOLVED`).
- **`packages/shared` se compila:** tras un pull que lo toque, corre `pnpm --filter @fidelity/shared build`. `pnpm run dev` lo recompila en modo watch.
- **Storage local (adjuntos de tickets):** si subir una captura falla con `database error, code: 42P10`, la imagen de `storage-api` es más vieja que el esquema `storage`. Se arregla con `printf v1.77.0 > supabase/.temp/storage-version`, seguido de `npx supabase stop` y `npx supabase start`.
- Billeteras reales (Dev 1): `APPLE_PASS_TYPE_IDENTIFIER`, `APPLE_TEAM_IDENTIFIER`, `APPLE_PASS_CERT`, `APPLE_PASS_KEY`, `APPLE_PASS_PASSWORD`, `APPLE_WWDR_CERT`, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_WALLET_PRIVATE_KEY` y, opcional para sandbox, `GOOGLE_WALLET_CLASS_ID`.
- Tras editar el `.env` del backend hay que **reiniciar `pnpm run dev`**: el modo watch no lo vuelve a leer.

**Cuentas de prueba** (las crea el seed; contraseña `password123` para todas):

| Rol | Correo | Entra a |
|---|---|---|
| `OWNER` | `owner@example.com` | `/admin/*` (panel completo) |
| `STAFF` (local centro) | `cajero1@example.com` · `cajero2@example.com` | `/scan` |
| `STAFF` (local Providencia) | `mesero@example.com` · `staff@example.com` | `/scan` |
| `PlatformAdmin` `SUPERADMIN` | `admin@example.com` | `/internal/*` (cuando exista, §11.5). No tiene marca |

La marca del seed es **"Café Demo"**, con **2 locales**: `/join/cafe-demo` y `/join/cafe-demo-providencia`. Tiene 2 promociones activas, Café (5 sellos) y Almuerzo (10), y los sellos valen en ambos locales. El `OWNER` trabaja por defecto con el local más antiguo. Un local registrado a mano recibe un slug neutro `local-xxxxxxxx`, que el dueño puede personalizar en Configuración.

**Tests contra la BD real** (RLS, triggers, `handle_new_user`), con Supabase local levantado y las migraciones aplicadas: `pnpm --filter backend run test:db`. Cada test corre en una transacción que se revierte, así que no ensucia los datos.

**Probar el flujo del cliente de punta a punta:**
1. Abrir `/join/<slug>` en una ventana de incógnito y registrarse con un RUT **y** un teléfono nuevos, aceptando los términos.
2. En otra ventana, entrar como `cajero1` y abrir `/scan`.
3. Sumar el sello con el **ingreso manual** (RUT/teléfono) o con la cámara. En modo mock el QR del cliente no se ve en ninguna parte: el `passToken` está en el link "Add to Apple Wallet" (`/api/passes/<passToken>/apple`) y se convierte en imagen localmente con `npx qrcode -o pase.png <passToken>`.
4. Repetir hasta el premio (con `STAMP_COOLDOWN_MINUTES=1`) y canjear.

---


## 10. Cómo trabajamos

- **Ramas:** `main` (estable) ← `dev` (integración) ← `feature/<nombre>`. Los PR van contra `dev`.
- **CI:** cada PR corre audit, lint (oxlint), typecheck, tests y build. **Un PR con CI rojo no se revisa.**
- **Antes de abrir PR:** `pnpm -r run lint && pnpm -r run typecheck && pnpm -r run test && pnpm -r run build`.
- **Cambios de esquema:** siempre por migración Prisma, nunca SQL suelto contra la base, y avisando en el PR — el panel admin tipa contra esas tablas.
- **Nueva app en el monorepo:** va en `apps/` y debe exponer los scripts `dev`, `build`, `lint`, `typecheck` y `test` para no romper la CI. **Ojo: el scanner NO es una app nueva** — vive en `apps/frontend` bajo `/scan` (decisión 3).
- **Contrato entre Dev 1 y Dev 2:** el Swagger en `/api/docs` es la fuente de verdad. Si un endpoint cambia de forma, se avisa antes de mergear.
- **Paquetes compartidos:** `packages/shared` (lo crea Dev 3, §11.4) debe exponer los mismos scripts que las apps. Contratos que cruzan frontend y backend (tickets, planes) se tipan ahí una sola vez.
- **Dependencias entre personas (2026-09-30):**
  - La **migración `Brand > Location` de Dev 3 va primero** (§7.11). Hasta que se mergee, Dev 1 y Dev 2 usan `brandId = merchantId` en sus rutas nuevas.
  - **Dev 2 consume el contrato de tickets de Dev 3** (§11.4) con un adaptador en memoria, así que no se bloquea.
  - **Dev 1 revisa** los PR de backend de Dev 2 (módulo `staff`) y de Dev 3 (migración).
  - Dev 1 y Dev 3 acuerdan los índices de la reportería.
- **Dependencias entre personas (2026-09-24):** Dev 2 puede avanzar UI y escaneo con mocks; solo la integración final depende de Dev 1. Dev 1 puede construir todo `/api/scan` sin los certificados de Apple. **Lo que sí bloquea de verdad hoy (2026-09-24):** las credenciales de Apple/Google Wallet (Dev 1), sin las que el cliente no recibe su tarjeta real. El resto se puede avanzar en paralelo: ver §3.2.

---

## 11. Dev 3 — Multi-local y panel interno `/internal/*`

*(Nueva 2026-09-30 — decisiones 5 a 8. Va al final para no renumerar las referencias existentes.)*

**Objetivo:** que la plataforma soporte cadenas (`Brand > Location`) sin romper nada de lo que ya funciona, y darnos a nosotros un panel para operar: ver todas las marcas y sus locales, dónde están, a quién llamar y qué tickets tienen abiertos.

### 11.1 Orden de trabajo
1. **Migración `Brand > Location` + `LoyaltyProgram` + `PlatformAdmin` + `AuditLog`** (§11.2). Bloquea a Dev 1 y Dev 2: va primero y en un solo PR.
2. **`packages/shared` + contrato de tickets** (§11.4). Publicarlo **antes** de construir la bandeja, porque Dev 2 programa contra él.
3. **`/admin/locations`**: sucursales del dueño, con mapa (§11.3).
4. **`/internal/*`**: marcas, mapa, tickets, clientes y auditoría (§11.5).

### 11.2 ✅ Migración `Brand > Location` *(2026-09-30, PR1 — modelo real en §4.1)*
Decisiones de implementación tomadas en el grill del 2026-09-30:
- **Sin renombrar `Merchant`** (glosario en §4.1).
- **4 PRs secuenciales:** PR1 migración, PR2 tickets, PR3 sucursales, PR4 panel interno.
- **Bloqueo de 30 min por marca.**
- **Tests del SQL en la CI con Supabase local.**

Pasos del plan original, con lo que cambió:
1. Crear `Brand`, `LoyaltyProgram`, `BrandMember`, `PlatformAdmin` y `AuditLog`.
2. ~~Renombrar `Merchant` → `Location`~~ **No se renombró:** se agregaron `brandId` y los campos de dirección y contacto a `Merchant`.
3. **Backfill**, por cada local existente: una `Brand` (con `name` y `contactEmail` desde `Merchant.email`), un `LoyaltyProgram` `STAMPS` con el `stampValidityDays` del local, `Promotion.programId`, `Pass.programId`, y `Stamp`/`Scan` con `locationId` = el id del local y `programId`.
4. Cambiar el unique de `Pass` a `(customerId, programId)` y, **al final**, eliminar `Merchant.stampValidityDays` y las columnas viejas.
5. `MerchantUser` → `BrandMember`: `OWNER` sin `locationId` y `STAFF` con el `locationId` de su local actual.
6. **RLS:** `current_brand_ids()`, `is_brand_owner(brandId)`, `current_program_ids()` e `is_program_owner()`. `current_merchant_ids()` e `is_merchant_owner()` mantienen su firma con semántica de marca. Todas son `SECURITY DEFINER STABLE` con `search_path` fijo. El `OWNER` ve toda su marca. El `STAFF` lee su local, más los pases y saldos de la marca (ver §4.1). Escritura solo para `OWNER`. `authenticated` **sin grants** sobre `PlatformAdmin` y `AuditLog`.
7. **`handle_new_user`**: un dueño nuevo recibe `Brand` + `Location` (slug neutro `local-<8 hex>`) + `LoyaltyProgram` + `BrandMember OWNER`. La regla sigue igual: **`raw_user_meta_data` no decide permisos** (§7.1).
8. **Backend (en pareja con Dev 1):** `/api/scan` resuelve el pase por programa y registra `locationId` (el del `STAFF`, o el que elige el `OWNER`). El bloqueo de 30 min se evalúa por pase, es decir, por marca (§8.1). `by-slug` devuelve el local con su marca y su programa. El alta crea el pase en el programa. `staff` pasa a trabajar por marca.
9. **Seed:** "Café Demo" con **2 locales** (`cafe-demo` y `cafe-demo-providencia`), 1 `OWNER`, meseros repartidos entre ambos locales y 1 `PlatformAdmin` `SUPERADMIN` (`admin@example.com`).

**DoD:**
- [x] SQL probado contra una BD real (`test/db`, Vitest + Prisma con `SET ROLE` y JWT de Supabase, job `db-tests`).
- [x] Flujo del §9 **sellando en un local y canjeando en otro**, contra el backend y Supabase locales.
- [x] Un `STAFF` no lee datos de otra marca ni clientes, y no puede escanear en otro local de su marca (403).
- [x] Un usuario recién registrado no puede darse membresía por metadata.
- [ ] CI verde en el PR. *El job `db-tests` es nuevo: validar que `supabase start` corre en GitHub Actions.*

**Para quien hace pull del PR1:** `pnpm --filter backend exec prisma generate`, luego `prisma migrate deploy`, y para tener los 2 locales, reset + seed (§9).
- **Frontend:** los servicios del panel filtran por `brandId`/`programId`, y `useMembership` expone `brandId`, `merchantId` y `programId`.
- **Backend:** `resolveLocationAccess` (en `common/access/brand-access.ts`) reemplaza a los `merchantUser.findUnique`.
- **`GET /api/merchants/by-slug/:slug`** agrega `brandId` y `brandName`.
- **Google Wallet:** la clase pasa a ser una por programa (`fidelity_<programId>`), y la tarjeta muestra el nombre de la marca.

### 11.3 Sucursales — `/admin/locations`
- CRUD de locales de la marca para el `OWNER`: nombre, dirección, comuna, región, teléfono, contacto y slug (con la misma advertencia de QR impresos que hay hoy en Configuración).
- Mapa **Leaflet + OpenStreetMap** con pin arrastrable. El componente `LocationMap` se reutiliza en `/internal`.
- **Geocoding:** `GET /api/geocode?q=` en el backend, como proxy a Nominatim, con rate limit (la política de Nominatim es de 1 req/s y exige `User-Agent` identificable) y caché. El navegador nunca llama a Nominatim directamente.
- Desactivar un local no borra nada: deja de aceptar escaneos y `/join/:slug` muestra "local no disponible".

### 11.4 ✅ Contrato de tickets de soporte (fuente de verdad para Dev 2 y Dev 3) — implementado en el PR2

> **Implementado (2026-10-01):**
> - Tipos y constantes en `packages/shared/src/support.ts`: `TICKET_CATEGORIES`, `TICKET_STATUS_LABELS`, `TICKET_TRANSITIONS`, `canTransition`…
> - Backend en `apps/backend/src/support`.
> - Migración `20261001120000_support_tickets`. Los números de ticket parten en **#1000**.
> - Decisiones del grill: **solo el OWNER crea tickets**; las 9 categorías y los estados, tal como están abajo; aviso **solo en el panel** (`unreadForMerchant`), sin correo.
>
> Diferencias con lo escrito abajo:
> - `GET /api/internal/me` → `{ userId, email, role }`.
> - La respuesta interna acepta `status` opcional para responder y cambiar el estado en un solo paso.
> - `OPEN → CLOSED` está permitido, para descartar spam.
> - Una captura de más de 10 MB responde **413**.
> - Crear un ticket **no exige que la marca esté activa**: una marca suspendida tiene que poder escribir a soporte.
> - Las transiciones válidas son las de `TICKET_TRANSITIONS` en `packages/shared`.

**Tipos** — `packages/shared/src/support.ts`:
```ts
export type TicketCategory =
  | 'SCANNER'      // Escáner / cámara
  | 'WALLET'       // Tarjetas en Apple / Google Wallet
  | 'CUSTOMERS'    // Clientes y sellos
  | 'PROMOTIONS'   // Promociones y programas
  | 'TEAM'         // Equipo y accesos de meseros
  | 'LOCATIONS'    // Sucursales
  | 'BILLING'      // Facturación y planes
  | 'ACCOUNT'      // Mi cuenta / inicio de sesión
  | 'OTHER';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_MERCHANT' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';   // solo la asigna el equipo interno
export type TicketAuthorType = 'MERCHANT' | 'PLATFORM';

export interface TicketAttachmentDto {
  id: string; fileName: string; mimeType: 'image/png' | 'image/jpeg'; sizeBytes: number;
  url: string;              // URL firmada de Supabase Storage, vence en 5 min
}
export interface TicketMessageDto {
  id: string; authorType: TicketAuthorType; authorName: string;   // "Equipo de soporte" para PLATFORM
  body: string; isInternal: boolean;     // siempre false en las respuestas para el dueño
  attachments: TicketAttachmentDto[]; createdAt: string;
}
export interface TicketSummaryDto {
  id: string; number: number;            // correlativo legible: #1024
  category: TicketCategory; status: TicketStatus;
  excerpt: string;                       // primeros 120 caracteres de la descripción
  locationId: string | null; locationName: string | null;
  lastMessageAt: string; createdAt: string;
  unreadForMerchant: boolean;
}
export interface TicketDetailDto extends TicketSummaryDto {
  description: string; contactPhone: string | null;   // E.164
  messages: TicketMessageDto[];
}
export interface InternalTicketDto extends TicketDetailDto {   // solo /api/internal
  brandId: string; brandName: string; priority: TicketPriority;
  assignee: { userId: string; name: string } | null;
  createdBy: { userId: string; email: string };
  resolvedAt: string | null;
}
export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number; }
```

**Endpoints del dueño** (Dev 3 los construye; Dev 2 los simula hasta entonces). Solo `OWNER` de la marca:
```jsonc
// POST /api/brands/:brandId/support/tickets      multipart/form-data
//   category: TicketCategory (obligatorio) · description: string 20–5000 (obligatorio)
//   locationId?: uuid de un local de la marca · contactPhone?: E.164 · attachment?: PNG/JPG ≤ 10 MB
// → 201 TicketDetailDto

// GET  /api/brands/:brandId/support/tickets?status=&page=1&pageSize=20   → 200 Paginated<TicketSummaryDto>
// GET  /api/brands/:brandId/support/tickets/:ticketId                     → 200 TicketDetailDto (sin notas internas)
// POST /api/brands/:brandId/support/tickets/:ticketId/messages            multipart: body (1–5000) + attachment?
//   → 201 TicketMessageDto · si el ticket estaba RESOLVED pasa a OPEN; si está CLOSED → 409
```

**Endpoints internos** (`PlatformAdminGuard`; `SUPPORT` y `SUPERADMIN`):
```jsonc
// GET   /api/internal/tickets?status=&category=&priority=&brandId=&assigneeId=&q=&page=   → Paginated<InternalTicketDto>
// GET   /api/internal/tickets/:ticketId                                                    → InternalTicketDto (con notas internas)
// PATCH /api/internal/tickets/:ticketId   { status?, priority?, assigneeId? | null }       → InternalTicketDto
// POST  /api/internal/tickets/:ticketId/messages   multipart: body + isInternal (bool) + attachment?
//   → una respuesta pública (isInternal: false) pasa el ticket a WAITING_ON_MERCHANT, salvo que se indique otro estado
```

**Reglas:**
- **Storage:** bucket **privado** `support-attachments`, con ruta `{brandId}/{ticketId}/{uuid}.{png|jpg}`. El tipo se valida por **magic bytes**, no por la extensión ni el `Content-Type`. Solo se entregan URLs firmadas de 5 min.
- Transiciones válidas: `OPEN → IN_PROGRESS → WAITING_ON_MERCHANT ⇄ IN_PROGRESS → RESOLVED → CLOSED`. `RESOLVED` se cierra solo a los 7 días sin respuesta (job). Cualquier otra transición responde 409.
- `number` es un correlativo global (secuencia de Postgres), no el UUID.
- Las notas internas **nunca** salen por los endpoints del dueño. Hay que testearlo.
- Rate limit al crear: 10 tickets por hora por marca.
- Cambios de estado, prioridad y asignación quedan en `AuditLog`.

### 11.5 Panel interno — `/internal/*`
**Acceso:** login con la misma pantalla de Supabase Auth. Tras el login, `GET /api/internal/me` dice si el usuario es `PlatformAdmin` y con qué rol; si no lo es, cae a `/admin` o `/scan` según su membresía. Páginas con `React.lazy` (§7.10).

| Pantalla | Qué muestra / hace | `SUPPORT` | `SUPERADMIN` |
|---|---|---|---|
| `/internal/brands` | Listado con búsqueda: marca, plan (mock), estado, locales, clientes, último escaneo | ✅ ver | ✅ ver |
| `/internal/brands/:id` | Datos de la marca y del `OWNER` (contacto), locales, programas, promociones, meseros y actividad reciente | ✅ ver | ✅ editar configuración, suspender o reactivar |
| `/internal/locations/map` | Mapa con todas las sucursales (`LocationMap`), con filtro por marca y región | ✅ | ✅ |
| `/internal/tickets` | Bandeja con filtros; detalle con hilo, notas internas, asignación, estado y prioridad (§11.4) | ✅ gestionar | ✅ gestionar |
| `/internal/customers` | Búsqueda de clientes finales por marca: RUT y teléfono **enmascarados** | ✅ enmascarado | ✅ "Ver dato completo" con motivo obligatorio → `AuditLog` |
| `/internal/audit` | Visor del `AuditLog`, con filtros por actor, entidad y fecha | ❌ | ✅ |

**Reglas:**
- Todo sale de `/api/internal/*`, nunca de supabase-js (§7.10).
- Toda edición guarda `before`/`after` en `AuditLog`. Una marca suspendida hace que `/api/scan` responda 403 y `/join` muestre "local no disponible"; **las tarjetas que ya están en la billetera no se invalidan**.
- **Fuera de alcance:** impersonar a un `OWNER`, crear o borrar marcas desde `/internal` (el alta la hace el dueño al registrarse) y asignar `PlatformAdmin` desde la UI.

**DoD (Dev 3, panel interno):**
- [ ] Un `OWNER`, un `STAFF` y un usuario sin sesión reciben 403/401 en **todos** los `/api/internal/*` (test que recorre los controladores).
- [ ] `SUPPORT` no puede editar marcas, ver datos completos ni abrir `/internal/audit`.
- [ ] Cada escritura interna y cada "ver dato completo" dejan su fila en `AuditLog`.
- [ ] El chunk de `/internal` no aparece en el bundle principal (se revisa en el reporte de `vite build`).
- [ ] Las notas internas no aparecen en ninguna respuesta de `/api/brands/:brandId/support/*`.
