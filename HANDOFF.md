# Handoff — Fidelity Wallet

> Documento de traspaso para **Dev 1 (Backend / Motor de Pases)** y **Dev 2 (Frontend PWA & Cliente Final)**.
> Escrito por Dev 3 (infraestructura, base de datos y panel de administración).
> Última actualización: **2026-09-24** · Rama de referencia: `dev`.

> **¿Llegas nuevo o vuelves después de unos días?** Empieza por el **§3: checklist de lo hecho y lo que falta por dev**. Las secciones 0–2 explican el porqué; el §3 dice en qué estamos.

---

## 0. Cambios del 2026-09-20 — leer esto primero

Si ya leíste este documento antes de hoy, estas cuatro decisiones de equipo cambian cosas que el texto anterior **afirmaba al revés**. Ya están aplicadas en el resto del documento; esta tabla es el resumen de un vistazo.

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
SaaS **B2B2C**: le cobramos (suscripción mensual por local) al **comercio**, no al cliente final. De ahí se desprende:

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
| Uso semanal del panel por el dueño | ≥ 1 sesión/semana | Dev 3 |

### 1.5 Los actores y lo que ve cada uno
*(Actualizado 2026-09-20 — decisión 4. Antes decía que el cajero no tenía cuenta y que el dueño era el único con login. Ya no es así.)*

1. **Cliente final** — solo ve el landing de emisión y su tarjeta en la billetera. Nunca ve nuestra marca como app. **Sigue sin cuenta, sin contraseña y sin descarga.**
2. **Cajero / mesero (`STAFF`)** — **tiene cuenta propia de Supabase Auth desde hoy.** Ve la PWA de escaneo en `/scan`: cámara, confirmación y fallback por RUT/teléfono. Interfaz de un botón, usable con una mano y sin capacitación. Permisos: **solo lectura** del saldo de sellos de los clientes + el scanner. Si entra a `/admin/*` se lo redirige a `/scan`.
3. **Dueño del local (`OWNER`)** — ve el panel admin web bajo `/admin/*`: configura promociones (incluida la vigencia de los sellos), invita meseros y revisa métricas. Acceso completo de lectura y escritura.

La relación usuario↔comercio↔rol vive en la tabla `MerchantUser`. Un comercio tiene **un `OWNER` y N `STAFF`**.

### 1.6 Alcance del MVP (y lo que queda fuera, a propósito)
**Dentro:**
- Un comercio = un panel = una caja física, pero con **varios usuarios**: 1 `OWNER` + N `STAFF` (actualizado 2026-09-20).
- Promociones por sellos acumulados (`compra N, lleva 1`).
- **Sellos con vencimiento configurable** por comercio (`Merchant.stampValidityDays`), con consumo FIFO (actualizado 2026-09-20; el parámetro nació en `Promotion` y se movió a `Merchant` el mismo día).
- Emisión de pase Apple + Google, sellado y canje, con push de actualización.
- Panel con métricas básicas y CRUD de promociones.
- **Landing pública en `/`** separada del panel (actualizado 2026-09-20).

**Fuera del MVP (no construirlo aunque sea tentador):**
- Multi-local / franquicias con jerarquía `Brand > Location`. **Ojo:** los roles *dentro de un mismo comercio* (`OWNER`/`STAFF`) sí entran al MVP desde hoy — lo que sigue afuera es el multi-local. Ver §8.4.
- Puntos por monto gastado, niveles/tiers, cupones de descuento.
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
│  Panel Admin React/Vite (Dev 3)  │  apps/frontend → rutas /admin/*
└──────────────────────────────────┘
```

**Decisiones vigentes:**
- **Monorepo pnpm** (`apps/*`, `packages/*`). Node 22+, pnpm 11. **Solo hay dos apps: `apps/backend` y `apps/frontend`.**
- **Backend:** NestJS en ESM (`"type": "module"` — los imports internos llevan extensión `.js`), Prisma 6, Vitest.
- **Frontend:** React 19 + Vite + Tailwind 4 + React Router 7; tests con Vitest + Testing Library. **Una sola app sirve landing, panel y scanner** (ver el mapa de rutas abajo).
- **Base de datos:** Supabase local vía `supabase start` (API `:54321`, DB `:54322`, Studio `:54323`).
- **Autenticación:** Supabase Auth, tanto para el `OWNER` como para el `STAFF`. El trigger `handle_new_user` crea la fila `Merchant` **solo cuando el usuario nuevo no trae `merchant_id` en `raw_user_meta_data`**; si lo trae, es un mesero invitado y se lo asocia al comercio existente en vez de crearle uno propio.
- **`merchant.id === session.user.id` sigue siendo cierto para el `OWNER`** (el trigger reutiliza el UUID del usuario de auth), **pero ya no es la base de los permisos**: con dos roles eso se rompe. Los permisos salen de `MerchantUser`. Ver §7.8 por la deuda que esto deja en el panel.
- **El panel admin hoy consulta Supabase directamente** con la `anon key` (ver `apps/frontend/src/services/*`); no pasa por el backend NestJS. Por eso el permiso de solo-lectura del `STAFF` **se aplica en RLS, no escondiendo items del menú**: si el control viviera solo en la UI, el mesero entra igual escribiendo la URL.

**Mapa de rutas del frontend** *(decisión 2, 2026-09-20 — reemplaza el `path="*"` → login)*

| Ruta | Qué es | Acceso | Dueño |
|---|---|---|---|
| `/` | Landing estática explicativa | **Público** | ✅ existe (`pages/public/Home.tsx`) — ver §8.6 |
| `/admin/login` | Login del dueño | Público | Dev 3 |
| `/admin/reset` | Recuperación de contraseña | Público | Dev 3 |
| `/admin/dashboard` · `/admin/promotions` · `/admin/customers` · `/admin/settings` | Panel | **Protegido, solo `OWNER`** (un `STAFF` cae a `/scan`) | Dev 3 |
| `/join/:merchantName` | Landing de emisión del cliente final. El parámetro es `Merchant.slug` (ej. `/join/localcito`) | Público, sin login | Dev 2 |
| `/scan` | PWA del cajero | **Protegido: requiere sesión (`STAFF` u `OWNER`)** | Dev 2 |

**Por qué el panel queda namespaceado bajo `/admin/*`:** si mañana la landing se mueve a un sitio estático prerenderizado (por SEO y velocidad), **las URLs del panel no cambian**. Es la razón del prefijo; no es cosmética.

---

## 3. Estado del proyecto — qué está hecho y qué falta (verificado 2026-09-24)

> Verificado contra el código de `dev`, corriendo los tests y probando el flujo completo en local. Lo marcado **(2026-09-24)** está hecho pero **todavía no tiene PR mergeado**: si no lo ves en tu rama, está en camino.

### 3.1 ✅ Lo que ya está hecho

**Infraestructura y base de datos**
- [x] Monorepo pnpm (`apps/backend` + `apps/frontend`) con scripts raíz `dev / build / test / typecheck / lint`.
- [x] CI en cada PR a `main`/`dev` (`.github/workflows/pr-checks.yml`): install, `prisma generate`, `pnpm audit`, lint, typecheck, test y build.
- [x] Modelos `Merchant`, `MerchantUser`, `Promotion`, `Customer`, `Pass`, `Stamp`, `Scan` y la vista `PassStampBalance` (§4).
- [x] Sellos con vencimiento FIFO: un sello = una fila de `Stamp`. El saldo se calcula al leer; `Pass.stampsCount` ya no existe.
- [x] RLS por membresía en todas las tablas (SELECT para cualquier miembro, escritura solo `OWNER`), con `search_path` fijo en las funciones.
- [x] Grants de mínimo privilegio (`20260922120000_least_privilege_grants`): `anon` sin acceso a tablas; `authenticated` no puede leer `Pass.passToken`.
- [x] Trigger `handle_new_user`: crea el `Merchant` solo para dueños; a un mesero invitado (con `merchant_id` en la metadata) solo lo asocia como `STAFF`.
- [x] **(2026-09-24)** `Merchant.slug`, identificador público de `/join/:slug`. Migración `20260924120000_merchant_slug`: backfill de los locales existentes, sufijo `-2`, `-3` si hay colisión y generación automática en el trigger. **Es estable: renombrar el local no lo cambia**, porque ya puede estar impreso en los QR de las mesas.
- [x] **(2026-09-24)** Seed reproducible `apps/backend/prisma/seed.js`: 1 `OWNER` + 4 `STAFF` en un mismo local (§9). Antes el seed le creaba por error un local propio a cada `STAFF`.
- [x] `.env.example` versionado en backend y frontend.

**Backend — Dev 1** (PR #9 + cambios del 2026-09-24)
- [x] Fundaciones: `PrismaModule`, `ValidationPipe` estricta (`whitelist` + `forbidNonWhitelisted`), filtro de excepciones, `ConfigModule`, CORS, rate limiting (Throttler) y Swagger en `/api/docs`.
- [x] `POST /api/customers`: alta idempotente. **(2026-09-24)** Exige **RUT (módulo 11) y teléfono (`+569…`), los dos**, más `acceptedTerms: true`. Guarda la prueba del consentimiento en `Customer.termsAcceptedAt` y `termsVersion` (migración `20260924170000_customer_terms_acceptance`). A un cliente antiguo le completa el dato que le faltaba, pero **nunca sobrescribe** un RUT o teléfono ya registrado. Devuelve las URLs de billetera **solo la primera vez**, para que conocer un RUT ajeno no alcance para robarle la tarjeta.
- [x] `POST /api/passes/generate` (autenticado, requiere membresía) y `GET /api/passes/:passToken/apple` (`.pkpass`). `passToken` de 32 bytes aleatorios.
- [x] `POST /api/scan` (`STAMP` / `REDEEM`): transacción con `SELECT … FOR UPDATE` sobre el `Pass`, `expiresAt` congelado al sellar, canje FIFO con verificación atómica, `createdByUserId` en `Scan` y `Stamp` y datos del cliente enmascarados.
- [x] **(2026-09-24)** Ingreso manual: `/api/scan` acepta `customer: { rut | phone }` en lugar de `passToken`. La búsqueda queda acotada al comercio del cajero, y la membresía se valida antes de buscar.
- [x] **(2026-09-24)** Bloqueo antifraude: tras un sello, el pase no puede recibir otro durante **30 minutos**, ni por QR ni manual. Responde `alreadyScanned: true` con `nextStampAvailableAt` y los minutos restantes. Se configura con `STAMP_COOLDOWN_MINUTES`. El canje mantiene su ventana de 90 s contra el doble toque (§5.4).
- [x] **(2026-09-24)** `GET /api/merchants/by-slug/:slug`: público y con rate limit. Devuelve nombre, vigencia y promoción activa; nunca el email del dueño.
- [x] `POST /api/merchants/:merchantId/staff/invite`: solo `OWNER`, usa la `service_role key` en el backend e invita por email o crea el usuario con contraseña (§5.6).
- [x] Modo desarrollo `ALLOW_MOCK_PASSES=true`: emite pases de prueba sin certificados de Apple/Google.
- [x] **(2026-09-24)** **Varias promociones activas con un saldo único de sellos** (decisión §8.2):
  - todo sello vigente sirve para cualquier promoción activa, y el cliente elige en caja cuál canjear;
  - `STAMP` ya no necesita saber la promoción;
  - `REDEEM` recibe `promotionId` (obligatorio si hay más de una activa) y consume FIFO solo los sellos que esa promoción pide;
  - la respuesta trae `availablePromotions` con `canRedeem` por promoción;
  - migración `20260924150000_scan_redeemed_promotion`: `Scan.promotionId` registra qué promoción se canjeó.
- [x] **(2026-09-24)** `GET /api/merchants/by-slug/:slug` devuelve también `activePromotions` (todas las activas, de la más reciente a la más antigua).
- [x] 81 tests de Vitest (incluye validación del DTO de alta): sellado, anti-duplicado, bloqueo de 30 min, FIFO, varias promociones con saldo compartido, concurrencia de canje, ingreso manual, alta de clientes, emisión, invitación de staff, slug y utilidades de RUT/teléfono.

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
- [x] 105 tests de Vitest + Testing Library.

**Flujo completo verificado en local (2026-09-24), con pases mock:** `/join/localcito` → alta del cliente → sello por QR y por RUT/teléfono → bloqueo de 30 min → premio desbloqueado → canje FIFO. También se verificó con **dos promociones activas**: se puede sellar, el canje exige elegir, rechaza si el saldo no alcanza y descuenta solo lo de la promoción elegida.

### 3.2 ⏳ Lo que falta, por responsable

Prioridad: 🔴 bloquea el piloto · 🟠 necesario para el piloto · 🟡 deuda · ⚪ opcional.

#### Dev 1 — Backend y motor de pases
- [ ] 🔴 **Credenciales reales de Apple y Google Wallet** (§7.3) y probar la emisión en teléfonos reales. **Es el bloqueante para salir a producción:** sin ellas solo funciona el modo mock, y el cliente no tiene cómo ver su QR (el `.pkpass` mock es un JSON y el link de Google no abre).
- [ ] 🔴 **Push de actualización real** (§5.5). `notifyPassUpdate` hoy solo escribe un log. Falta el web service de PassKit (`/v1/devices/...`) con APNs, y el PATCH del `loyaltyObject` en la Google Wallet API. Sin esto la tarjeta del cliente nunca cambia de `0 / 5`.
- [ ] 🟠 **`POST /api/customers` debe ser atómico.** Si falla la generación de las URLs de billetera, el `Customer` y el `Pass` ya quedaron creados, y el reintento responde `isNew: false` **sin URLs**: el cliente queda registrado pero sin tarjeta y sin forma de obtenerla.
- [ ] 🟠 **Recuperar un pase perdido.** `JoinSuccess` le promete al cliente "pronto podrás recuperarlo", pero no existe el flujo. Necesita verificación (por ejemplo OTP por SMS): devolver el pase solo con el RUT permitiría suplantar al cliente.
- [ ] 🟡 Tests pendientes del DoD (§5.7): vencimiento contra una BD real (hoy la query está mockeada), no-retroactividad de `stampValidityDays` y e2e reales (`test/app.e2e-spec.ts` sigue siendo el del boilerplate).
- [ ] 🟡 **Borrado de datos personales** (Ley 19.628, §7.2). Los términos ya ofrecen pedirlo por correo; falta el proceso o endpoint que elimine al `Customer`, sus pases y sellos.
- [ ] ⚪ Opcional: pase web `/pase/:passToken` como respaldo para quien no usa billetera, que además facilita las pruebas sin credenciales.

#### Dev 2 — PWA del cajero y landing del cliente
- [ ] 🔴 **Probar la cámara en iOS Safari y Android Chrome reales** tras los cambios del 2026-09-24 a `QRCam.tsx`, y medir el objetivo de < 2 s. Fuera de `localhost` la cámara exige **HTTPS**.
- [ ] 🟠 **PWA instalable:** no hay `manifest` ni service worker.
- [ ] 🟠 **Distinguir sesión vencida de caída de red** (§6.1, §7.9). Hoy los dos casos terminan en "Error de red o de servidor".
- [ ] 🟡 Badges oficiales de Apple y Google Wallet en `JoinSuccess`. Hoy son botones propios, y ambas marcas tienen guías estrictas.
- [ ] 🟡 **Probar en un teléfono real la pantalla de elección de premio** con 3 o más promociones: lista larga en pantallas chicas y uso con una mano.
- [ ] ⚪ Opcional: mostrar al cajero `nextExpiryAt` ("te vence un sello el jueves"); el backend ya lo devuelve.

#### Dev 3 — Panel admin y base de datos
- [ ] 🔴 **Mostrar al dueño su link `/join/<slug>` y un QR imprimible para las mesas.** Hoy el panel no lo muestra en ningún lado: el dueño no tiene cómo saber su propia URL.
- [ ] 🟠 **Slug de los locales nuevos:** se genera al registrarse a partir del nombre por defecto `Mi Local (<usuario>)`, así que queda como `mi-local-<usuario>`. Decidir si el dueño puede elegirlo o editarlo una vez (sabiendo que cambiarlo rompe los QR ya impresos).
- [ ] 🟠 **UI para invitar, listar y dar de baja meseros** sobre el endpoint que ya existe (§5.6). Hoy solo se puede por API o con el seed.
- [ ] 🟡 **Métricas por promoción en el dashboard:** `Scan.promotionId` ya dice qué premio se canjeó en cada `REWARD_REDEEMED` (qué promoción rinde más, cuánto se entrega de cada una). Hoy el dashboard solo cuenta canjes totales.
- [ ] 🟡 **Texto del panel de promociones:** explicarle al dueño que puede tener varias activas y que los sellos de sus clientes sirven para cualquiera, así que activar una promoción cara no les quita sellos a los que juntan para otra.
- [ ] 🟡 Llaves de producción y despliegue (§7.5).

#### Equipo — legal
- [ ] 🔴 **Completar y validar los términos antes de producción.** En `pages/public/Terms.tsx`, el objeto `LEGAL` tiene marcadores `[RAZÓN SOCIAL]`, `[RUT]`, `[DOMICILIO]` y `[CORREO DE CONTACTO]` que hoy se ven en la página pública. El texto es una plantilla estándar y **necesita revisión de un abogado**, incluida la adecuación a la Ley 21.719 de protección de datos cuando entre en vigencia.
- [ ] 🟡 Si cambia el texto de los términos, subir `TERMS_VERSION` en `Terms.tsx` **y** en `apps/backend/src/customers/terms.ts` en el mismo PR.

#### Equipo — decisiones abiertas (§8)
- [ ] §8.5 — ¿Quién puede anular un sello mal dado o agregar uno manual sin cliente presente?
- [ ] §8.8 — Aviso de vencimiento: con cuánta antelación, por qué canal y quién lo construye.
- [ ] §8.1 — Confirmar token estático + bloqueo de 30 min como política antifraude del MVP.

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
| `Scan` | `passId`, `merchantId`, `type`, `promotionId?`, `createdByUserId?` | `ScanType = STAMP_ADDED \| REWARD_REDEEMED`. Es el libro contable: no se edita ni se borra. **`promotionId` (2026-09-24) solo se llena en `REWARD_REDEEMED`: qué premio eligió el cliente.** **`createdByUserId` (nuevo) dice qué mesero dio cada sello** — es lo que permite detectar al que se auto-sella |
| `PassStampBalance` *(vista)* | `passId`, `merchantId`, `customerId`, `activeStamps`, `nextExpiryAt` | **Nueva. El saldo se calcula al leer**: `activeStamps` cuenta los sellos no consumidos y no vencidos. Creada con `security_invoker = true` para que **el RLS siga aplicando** (una vista normal corre con los permisos de su dueño y saltearía el RLS). `nextExpiryAt` ignora a propósito los sellos sin fecha de vencimiento |

**Convenciones:** tablas y columnas en **PascalCase/camelCase** entrecomilladas en SQL (`"Stamp"."expiresAt"`), no snake_case. Los IDs son UUID generados por Postgres (`gen_random_uuid()`).

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
  "targetStamps": 5,                    // STAMP: de la promoción más reciente · REDEEM: de la canjeada
  "rewardUnlocked": true,               // el saldo alcanza para AL MENOS una promoción activa
  "rewardName": "Café gratis",
  "availablePromotions": [              // todas las activas, más reciente primero
    { "id": "uuid", "name": "Almuerzo", "rewardName": "Almuerzo gratis", "targetStamps": 8, "canRedeem": false },
    { "id": "uuid", "name": "Café", "rewardName": "Café gratis", "targetStamps": 3, "canRedeem": true }
  ],
  "nextExpiryAt": "2026-10-24T03:30:39Z",
  "nextStampAvailableAt": "...",        // solo en un sello bloqueado
  "customer": { "id": "uuid", "rut": "12.***.*78-5", "phone": null },
  "message": "Sello agregado exitosamente (4/5)"
}
```

Reglas, **todas dentro de una transacción de base de datos**:
1. Resolver `passToken` → `Pass`. Si no existe o no pertenece al `merchantId` que escanea → **403, y no se registra nada**.
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

> ✅ **Hecho (PR #9):** `POST /api/merchants/:merchantId/staff/invite`, solo para `OWNER`. Sin `password` invita por email (`inviteUserByEmail`); con `password` crea el usuario directamente. **Falta la UI en el panel** — la tiene Dev 3 (§3.2).

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
3. Ingresa RUT **o** teléfono → `POST /api/customers`.
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
- [ ] PWA instalable verificada. *No hay manifest ni service worker.*
- [x] **El scanner vive en `apps/frontend` bajo `/scan`** — no se agregó ninguna app nueva al monorepo.
- [ ] **Login del cajero funcionando**, con sesión persistente y **refresh de token probado tras varias horas con la pantalla abierta**. *Login y sesión persistente funcionan (Supabase); falta la prueba de varias horas.*
- [ ] **Sesión vencida y caída de red se muestran distinto**, y ninguna de las dos deja la pantalla en blanco.
- [x] Un `STAFF` que entra a `/admin/*` termina en `/scan` (y no en una pantalla rota).
- [x] La pantalla del cajero lee el saldo de la respuesta de `/api/scan` (`activeStamps`), **nunca de `Pass.stampsCount`** (ya no existe).
- [x] Fallback manual por RUT/teléfono funcionando contra el backend.
- [x] Landing `/join/:merchantName` conectada al backend, con vigencia y aviso de datos personales.
- [ ] Badges oficiales de Apple/Google Wallet en la confirmación.

---

## 7. Riesgos y bloqueantes

### 7.1 🟠 RLS: ya existe, pero la que importa es la de membresía
*(Era 🔴 "No hay Row Level Security en la base". Se corrigió: `20260920041500_harden_rls_and_trigger` activó RLS en todas las tablas y `20260921010000_stamps_with_expiry` la extendió a `Stamp`.)*

El panel admin consulta Supabase **directamente con la `anon key`** y filtra por `merchantId` **en el cliente**, así que **el RLS es la única barrera real**: sin políticas, cualquier comercio autenticado podía, cambiando un UUID en una petición, leer o modificar datos de otro — clientes, pases y escaneos incluidos. Eso ya está cerrado.

Lo que queda abierto es más fino y más caro: **las políticas originales eran `"merchantId" = auth.uid()`, y eso se rompe con más de un usuario por comercio** (decisión 4). La reescritura contra la membresía ya está en la rama (`20260921020000_merchant_users_and_roles`): funciones `SECURITY DEFINER STABLE` con `search_path` fijo (`current_merchant_ids()`, `is_merchant_owner()`), **SELECT para cualquier miembro, INSERT/UPDATE/DELETE solo para `OWNER`**. **Hay que aplicar esa migración** (`prisma migrate dev`) antes de probar cualquier cosa con dos usuarios: hasta entonces un `STAFF` no tiene acceso correcto a nada. La `service_role key` queda reservada **exclusivamente para el backend**. Responsable: **Dev 3**, pero afecta a los tres. Bloqueante antes del primer piloto con un local real.

**Bug concreto que esto destapó y ya se corrigió:** el trigger `handle_new_user` creaba un `Merchant` por **cada** usuario nuevo de `auth.users`, así que **el primer mesero invitado se habría auto-creado su propio local**. Ahora distingue por el `merchant_id` que viene en `raw_user_meta_data`.

### 7.2 🟠 Datos personales (Ley 19.628 / RUT)
Estamos guardando RUT y teléfono de clientes finales. Hace falta, como mínimo: aviso de privacidad en el landing, propósito declarado y una vía para solicitar borrado.
*Estado 2026-09-24:* hay aviso en el landing, términos en `/terminos` con el propósito, los datos tratados y los derechos del titular, y **consentimiento expreso registrado** (checkbox obligatorio + `Customer.termsAcceptedAt` / `termsVersion`). Falta el proceso real de borrado (§3.2, Dev 1) y la revisión legal del texto (§3.2, Equipo). Evitar exponer el RUT completo en la pantalla del cajero (mostrar solo los últimos dígitos, como en §5.4).

### 7.3 🟠 Certificados Apple / Google (bloqueante para Dev 1)
`passkit-generator` necesita certificados reales de una cuenta **Apple Developer (USD 99/año)**: Pass Type ID, `.p12` y certificado WWDR. Google Wallet requiere una Service Account de Google Cloud y el alta del Issuer. Sin esto no se puede probar la emisión real ni APNs.
*Mitigación:* arrancar con pases estáticos de prueba y una interfaz `PassProvider` que permita cambiar la implementación después, para que el resto del flujo (`/api/scan`, PWA, landing) avance en paralelo. Los push quedan bloqueados igual.
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

### 8.4 ✅ DECIDIDA PARCIALMENTE (2026-09-20) — Roles y multi-local
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
- `apps/frontend/.env` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (por defecto `http://localhost:3000`).
- `apps/backend/.env` → `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Desarrollo sin certificados: **`ALLOW_MOCK_PASSES=true`**. Sin esta variable, `POST /api/customers` responde 500.
- Antifraude: `STAMP_COOLDOWN_MINUTES` (por defecto 30). Para probar localmente sin esperar, usar `1`.
- Billeteras reales (Dev 1): `APPLE_PASS_TYPE_IDENTIFIER`, `APPLE_TEAM_IDENTIFIER`, `APPLE_PASS_CERT`, `APPLE_PASS_KEY`, `APPLE_PASS_PASSWORD`, `APPLE_WWDR_CERT`, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_WALLET_PRIVATE_KEY`.
- Tras editar el `.env` del backend hay que **reiniciar `pnpm run dev`**: el modo watch no lo vuelve a leer.

**Cuentas de prueba** (las crea el seed; contraseña `password123` para todas):

| Rol | Correo | Entra a |
|---|---|---|
| `OWNER` | `owner@example.com` | `/admin/*` (panel completo) |
| `STAFF` | `cajero1@example.com` · `cajero2@example.com` · `mesero@example.com` · `staff@example.com` | `/scan` |

El local del seed se llama "Mi Local (owner)"; su slug se genera al registrarse (`/join/mi-local-owner`) y **no cambia** si lo renombras en Configuración.

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
- **Dependencias entre personas:** Dev 2 puede avanzar UI y escaneo con mocks; solo la integración final depende de Dev 1. Dev 1 puede construir todo `/api/scan` sin los certificados de Apple. **Lo que sí bloquea de verdad hoy (2026-09-24):** las credenciales de Apple/Google Wallet (Dev 1), sin las que el cliente no recibe su tarjeta real. El resto se puede avanzar en paralelo: ver §3.2.
