# Handoff — Fidelity Wallet

> Documento de traspaso para **Dev 1 (Backend / Motor de Pases)** y **Dev 2 (Frontend PWA & Cliente Final)**.
> Escrito por Dev 3 (infraestructura, base de datos y panel de administración).
> Última actualización: **2026-09-20** · Rama de referencia: `dev` / `feature/stamp-expiry-roles-routing`.

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
- **La vigencia de los sellos se configura por comercio, no por promoción.** Nació en `Promotion` y se movió a `Merchant.stampValidityDays` (migración `20260921030000`, 2026-09-21): es una regla del local ("acá los sellos valen 3 meses"), el dueño la fija una sola vez en Configuración junto al nombre del negocio, y el escaneo ya no necesita resolver antes qué promoción aplica para saber cuánto dura el sello.

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
| Conversión del landing `/join/:merchantId` | > 60% | Dev 2 |
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
│   ├── googleapis (JWT Wallet)    │
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
| `/` | Landing estática explicativa | **Público** | ver §8.6 |
| `/admin/login` | Login del dueño | Público | Dev 3 |
| `/admin/reset` | Recuperación de contraseña | Público | Dev 3 |
| `/admin/dashboard` · `/admin/promotions` · `/admin/customers` · `/admin/settings` | Panel | **Protegido, solo `OWNER`** (un `STAFF` cae a `/scan`) | Dev 3 |
| `/join/:merchantId` | Landing de emisión del cliente final | Público, sin login | Dev 2 |
| `/scan` | PWA del cajero | **Protegido: requiere sesión (`STAFF` u `OWNER`)** | Dev 2 |

**Por qué el panel queda namespaceado bajo `/admin/*`:** si mañana la landing se mueve a un sitio estático prerenderizado (por SEO y velocidad), **las URLs del panel no cambian**. Es la razón del prefijo; no es cosmética.

---

## 3. Estado real del repositorio (verificado 2026-09-20)

### ✅ Hecho
| Área | Detalle |
|---|---|
| Monorepo | `pnpm-workspace.yaml`, scripts raíz `dev / build / test / typecheck / lint` |
| CI | `.github/workflows/pr-checks.yml`: install, `prisma generate`, `pnpm audit`, lint, typecheck, test y build en cada PR a `main`/`dev` |
| Base de datos | Migraciones: `20260919182348_init`, `20260919182411_add_merchant_trigger`, `20260920041500_harden_rls_and_trigger`, `20260921010000_stamps_with_expiry`, `20260921020000_merchant_users_and_roles`, `20260921030000_stamp_validity_per_merchant` |
| Modelos | `Merchant`, `MerchantUser`, `Promotion`, `Customer`, `Pass`, `Stamp`, `Scan`, enums `ScanType` y `MerchantRole` |
| Sellos con vencimiento | Tabla `Stamp` + `Merchant.stampValidityDays` + vista `PassStampBalance` (`security_invoker = true`). La migración **backfillea** una fila `Stamp` por cada sello del viejo `stampsCount` (con `expiresAt` NULL: los sellos anteriores a la funcionalidad **no vencen**) y recién después dropea la columna |
| RLS | Activa en `Merchant`, `MerchantUser`, `Promotion`, `Customer`, `Pass`, `Scan` y `Stamp`, ya reescrita contra la membresía (SELECT para cualquier miembro, escritura solo `OWNER`), con `search_path` fijo en todas las funciones |
| Auth comercios | Supabase Auth + trigger de alta de `Merchant`, ya corregido para no crear un comercio por cada mesero invitado |
| Panel admin | Login, layout con sidebar responsive, Dashboard con métricas y últimos escaneos, módulo de Promociones (listar, crear, editar, activar/desactivar) |
| Capa de servicios FE | `services/promotionsService.ts`, `services/dashboardService.ts`, hooks `useAuth` y `useDashboardStats`, componentes `StatCard` / `ErrorAlert` con tests |

### 🚧 Recién aterrizado hoy (Dev 3, rama `feature/stamp-expiry-roles-routing`) — verificalo al hacer pull
| Área | Detalle |
|---|---|
| Roles y RLS por membresía | `20260921020000_merchant_users_and_roles`: tabla `MerchantUser` + reescritura de **todas** las políticas contra la membresía, con funciones `SECURITY DEFINER STABLE` de `search_path` fijo (`current_merchant_ids()`, `is_merchant_owner()`), separando SELECT (cualquier miembro) de INSERT/UPDATE/DELETE (solo `OWNER`). Reemplaza la política provisoria `stamp_own` que había creado `20260921010000` |
| Routing | `App.tsx` ya implementa el mapa de §2: `/` público, `/join/:merchantId`, `/scan`, panel bajo `/admin/*` con guard de rol, y redirecciones desde las URLs viejas (`/dashboard` → `/admin/dashboard`) |
| Placeholder `/scan` | Ruta reservada dentro de `apps/frontend` (`src/pages/scanner/`) para que Dev 2 no colisione con el routing. **Es un placeholder: todavía no escanea nada** |
| Pendiente en esta rama | Migrar las páginas del panel de `session.user.id` al `merchantId` que entrega la membresía (§7.8) |

### ❌ No hecho (esto es el trabajo que se traspasa)
| Área | Detalle |
|---|---|
| Backend | `apps/backend/src` es **el boilerplate de NestJS sin tocar**: solo `AppController.getHello()`. No hay `PrismaModule`, ni módulos de dominio, ni endpoints, ni validación, ni Swagger |
| PWA del cajero | **No está implementada.** Va en `apps/frontend`, ruta `/scan` — **`apps/scanner` quedó sin efecto, no crearla** (decisión 3) |
| Invitación de meseros | No existe el endpoint para crear usuarios `STAFF`. Hoy las filas de `MerchantUser` se crean **a mano**. Asignado a Dev 1, ver §5.6 |
| Landing pública `/` | **No existe.** Ver §8.6 (falta definir quién la hace y qué lleva) |
| Landing de emisión | **No existe** la ruta `/join/:merchantId` |
| Motor de pases | No están instalados `passkit-generator` ni `googleapis`, ni hay certificados |
| Seeds | No hay seed reproducible de datos de demo |

---

## 4. Modelo de datos (contrato compartido — no cambiarlo sin avisar)

`apps/backend/prisma/schema.prisma` es la **única fuente de verdad**. Cualquier cambio va por migración Prisma y se avisa al equipo, porque el panel admin tipa contra estas mismas tablas.

| Modelo | Campos clave | Notas que importan |
|---|---|---|
| `Merchant` | `id` (UUID = auth user id del `OWNER`), `name`, `email` (único), `stampValidityDays?` | Creado por trigger al registrarse el dueño. **Esa igualdad ya no define permisos** — ver `MerchantUser` y §7.8. `stampValidityDays` **nullable: `null` = los sellos de este local no vencen.** Es una regla del local, no del premio: el dueño la configura una sola vez en Configuración, junto al nombre del negocio |
| `MerchantUser` | `userId` (= `auth.users.id`), `merchantId`, `role` (`OWNER` \| `STAFF`), PK compuesta `[userId, merchantId]` | **Nuevo 2026-09-20.** Es la fuente de verdad de los permisos. Todas las políticas RLS se evalúan contra esta tabla |
| `Promotion` | `merchantId`, `name`, `targetStamps`, `rewardName`, `isActive` | La vigencia de los sellos **no vive acá**: se movió a `Merchant` (2026-09-21). **La BD permite varias promociones activas por comercio a la vez** — ver §8.2 |
| `Customer` | `rut?` (único), `phone?` (único) | Ambos opcionales; al menos uno debe venir — **validación aún no implementada** |
| `Pass` | `customerId`, `merchantId`, `passToken` (único), `@@unique([customerId, merchantId])` | **`stampsCount` FUE ELIMINADO (2026-09-20).** El saldo se lee de `PassStampBalance`. **Un solo pase por cliente por comercio.** El pase **no tiene `promotionId`** — ver §8.2 |
| `Stamp` | `passId`, `merchantId`, `promotionId?`, `earnedAt`, `expiresAt?`, `consumedAt?`, `consumedByScanId?`, `sourceScanId?`, `createdByUserId?` | **Nuevo 2026-09-20. Un sello = una fila.** `expiresAt` se **congela al sellar** (`earnedAt` + `Merchant.stampValidityDays`) y no se recalcula: cambiar la vigencia **no afecta retroactivamente** sellos ya entregados. `promotionId` es `ON DELETE SET NULL` a propósito: borrar una promoción no puede vaciarle la tarjeta a nadie |
| `Scan` | `passId`, `merchantId`, `type`, `createdByUserId?` | `ScanType = STAMP_ADDED \| REWARD_REDEEMED`. Es el libro contable: no se edita ni se borra. **`createdByUserId` (nuevo) dice qué mesero dio cada sello** — es lo que permite detectar al que se auto-sella |
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
{ "merchantId": "uuid", "rut": "12.345.678-5", "phone": "+56912345678" }  // rut o phone, al menos uno
// response 201
{ "customerId": "uuid", "passId": "uuid", "isNew": true }
```
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

```jsonc
// request
{ "passToken": "...", "action": "STAMP" | "REDEEM", "merchantId": "uuid" }
// response 200
{
  "ok": true,
  "customerLabel": "···678-5",          // lo que el cajero lee en pantalla
  "stampsCount": 4,                     // sale de PassStampBalance.activeStamps — ya no de Pass
  "targetStamps": 5,
  "rewardUnlocked": false,
  "rewardName": "Café gratis"
}
```
*(El nombre del campo en el contrato y si se expone `nextExpiryAt` al cajero están sin decidir — §8.9.)*

Reglas, **todas dentro de una transacción de base de datos**:
1. Resolver `passToken` → `Pass`. Si no existe o no pertenece al `merchantId` que escanea → **403, y no se registra nada**.
2. Validar que exista una `Promotion` activa para ese comercio.
3. Insertar la fila en `Scan` (`STAMP_ADDED` o `REWARD_REDEEMED`), con `createdByUserId` = el usuario autenticado que ejecuta el escaneo.
4. **En `STAMP`: insertar una fila en `Stamp`** con `passId`, `merchantId`, `promotionId`, `earnedAt = now()`, `sourceScanId` = el `Scan` recién creado, `createdByUserId`, y `expiresAt` = `earnedAt` + `Merchant.stampValidityDays`, o `NULL` si el comercio no define vigencia. Al vivir en el comercio, el cálculo no depende de resolver antes qué promoción aplica (§8.2). **`expiresAt` se congela acá y no se vuelve a tocar nunca.**
5. Leer el saldo de `PassStampBalance` (`activeStamps`). Si `activeStamps >= targetStamps` → marcar premio desbloqueado.
6. **En `REDEEM`:** rechazar si `activeStamps < targetStamps`. Al canjear, **consumir los `targetStamps` sellos activos MÁS ANTIGUOS (FIFO, por `earnedAt` ascendente)** marcándolos con `consumedAt = now()` y `consumedByScanId`. Seleccionarlos y marcarlos dentro de la misma transacción, con bloqueo de filas, para que dos cajas no consuman el mismo sello.
7. **El saldo se calcula SIEMPRE al leer.** Nunca se guarda un contador y **ningún cron es responsable de la corrección**: un sello vencido deja de contar solo, porque la vista lo filtra. Un job programado servirá más adelante **únicamente** para disparar el push de aviso de vencimiento (§7.7), no para arreglar saldos.

**Anti-fraude mínimo del MVP:** ignorar (respondiendo éxito idempotente) un segundo escaneo del mismo pase en el mismo comercio dentro de una ventana corta — sugerido **90 segundos** — para evitar el doble timbre por doble toque del cajero. Devolver `alreadyScanned: true` para que la PWA lo muestre distinto.

### 5.5 Actualización de la billetera (push)
- Apple: endpoints de registro de dispositivo del protocolo PassKit (`/v1/devices/...`) + APNs para disparar la relectura del pase.
- Google: actualización del objeto vía Wallet API.
- Disparar en cada cambio del saldo (`activeStamps`) y al desbloquear premio.
- **El push no debe bloquear la respuesta de `/api/scan`.** El cajero no puede esperar a APNs: encolar o ejecutar en background y responder de inmediato.
- Cuidado con el ruido: con sellos que vencen, el saldo también **baja solo**, y cada caída dispara una actualización del pase. Leer §7.7 antes de conectar el push a cada cambio.

### 5.6 Invitar meseros `STAFF` (tarea nueva, **asignada a Dev 1**)
*(Nueva 2026-09-20 — decisión 4. Hoy es lo único que falta para que los roles funcionen de punta a punta.)*

- Invitar un usuario `STAFF` exige la **`service_role key`** (Supabase Admin API), así que **no se puede hacer desde el frontend con la `anon key`**. Hace falta **un endpoint de backend** para crear/invitar usuarios `STAFF` de un comercio.
- Ese endpoint **setea `merchant_id` y `role` en la metadata del usuario nuevo** — de ahí lo lee el trigger `handle_new_user` para no crearle un `Merchant` propio (§2).
- **Hasta que exista, las filas de `MerchantUser` se crean a mano** contra la base.

### 5.7 Definition of Done (Dev 1)
- [ ] DTOs validados en todos los endpoints.
- [ ] Swagger publicado en `/api/docs`.
- [ ] Tests de Vitest sobre la lógica de sellado, incluyendo el borde `activeStamps == targetStamps` y el doble escaneo.
- [ ] **Test del vencimiento:** un sello con `expiresAt` pasado no cuenta en el saldo; uno con `expiresAt` NULL nunca vence.
- [ ] **Test del FIFO:** al canjear se consumen los sellos más antiguos, no los últimos.
- [ ] **Test de no-retroactividad:** cambiar `stampValidityDays` en el comercio no mueve el `expiresAt` de sellos ya entregados.
- [ ] **`/api/scan` graba `createdByUserId`** en `Scan` y en `Stamp`.
- [ ] **Endpoint de invitación de `STAFF` (§5.6)** funcionando con `service_role key`, y esa key **nunca** expuesta al frontend.
- [ ] `lint`, `typecheck`, `test` y `build` en verde.

---

## 6. Dev 2 — PWA del cajero y experiencia del cliente

**Objetivo:** las dos superficies donde el producto se gana o se pierde en la calle. Ambas viven dentro de `apps/frontend`; el mapa de rutas completo está en §2.

### 6.1 PWA de escaneo — ruta `/scan` dentro de `apps/frontend`
> ⚠️ **Cambio 2026-09-20 (decisión 3):** la versión anterior de este documento mandaba crear `apps/scanner` como app nueva del monorepo. **Eso queda sin efecto.** La PWA del cajero se construye **dentro de `apps/frontend`, en la ruta `/scan`**. Ya hay un placeholder reservando esa ruta para que no colisionemos.

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

### 6.2 Landing de adquisición `/join/:merchantId`
Flujo completo en una sola pantalla, sin scroll innecesario:
1. El cliente escanea el QR físico de la mesa y aterriza aquí.
2. Ve el nombre del local y la promoción vigente ("Junta 5 sellos, llévate un café").
3. Ingresa RUT **o** teléfono → `POST /api/customers`.
4. Aparecen los botones oficiales **"Add to Apple Wallet"** / **"Add to Google Wallet"** (usar los badges oficiales; Apple y Google tienen guías de marca estrictas).
5. Detectar plataforma: mostrar primero el botón de la billetera del dispositivo.
6. Pantalla de confirmación con instrucción explícita de qué hacer en la próxima visita.

**Requisitos no negociables del landing:** carga rápida en 4G, cero login, cero contraseñas, mobile-first, texto legible sin zoom y una línea sobre el tratamiento de datos personales (§7.2).

Si el comercio tiene `stampValidityDays`, **decirlo acá** en lenguaje humano ("tus sellos valen 3 meses"). Enterarse del vencimiento cuando el contador ya bajó es la peor forma de enterarse (§7.7).

### 6.3 Definition of Done (Dev 2)
- [ ] Probado en **iOS Safari y Android Chrome reales**, no solo en el emulador de escritorio — los permisos de cámara se comportan distinto.
- [ ] Tests de los componentes críticos, lint/typecheck en verde.
- [ ] PWA instalable verificada.
- [ ] **El scanner vive en `apps/frontend` bajo `/scan`** — no se agregó ninguna app nueva al monorepo.
- [ ] **Login del cajero funcionando**, con sesión persistente y **refresh de token probado tras varias horas con la pantalla abierta**.
- [ ] **Sesión vencida y caída de red se muestran distinto**, y ninguna de las dos deja la pantalla en blanco.
- [ ] Un `STAFF` que entra a `/admin/*` termina en `/scan` (y no en una pantalla rota).
- [ ] La pantalla del cajero lee el saldo de `PassStampBalance` / de la respuesta de `/api/scan`, **nunca de `Pass.stampsCount`** (ya no existe).

---

## 7. Riesgos y bloqueantes

### 7.1 🟠 RLS: ya existe, pero la que importa es la de membresía
*(Era 🔴 "No hay Row Level Security en la base". Se corrigió: `20260920041500_harden_rls_and_trigger` activó RLS en todas las tablas y `20260921010000_stamps_with_expiry` la extendió a `Stamp`.)*

El panel admin consulta Supabase **directamente con la `anon key`** y filtra por `merchantId` **en el cliente**, así que **el RLS es la única barrera real**: sin políticas, cualquier comercio autenticado podía, cambiando un UUID en una petición, leer o modificar datos de otro — clientes, pases y escaneos incluidos. Eso ya está cerrado.

Lo que queda abierto es más fino y más caro: **las políticas originales eran `"merchantId" = auth.uid()`, y eso se rompe con más de un usuario por comercio** (decisión 4). La reescritura contra la membresía ya está en la rama (`20260921020000_merchant_users_and_roles`): funciones `SECURITY DEFINER STABLE` con `search_path` fijo (`current_merchant_ids()`, `is_merchant_owner()`), **SELECT para cualquier miembro, INSERT/UPDATE/DELETE solo para `OWNER`**. **Hay que aplicar esa migración** (`prisma migrate dev`) antes de probar cualquier cosa con dos usuarios: hasta entonces un `STAFF` no tiene acceso correcto a nada. La `service_role key` queda reservada **exclusivamente para el backend**. Responsable: **Dev 3**, pero afecta a los tres. Bloqueante antes del primer piloto con un local real.

**Bug concreto que esto destapó y ya se corrigió:** el trigger `handle_new_user` creaba un `Merchant` por **cada** usuario nuevo de `auth.users`, así que **el primer mesero invitado se habría auto-creado su propio local**. Ahora distingue por el `merchant_id` que viene en `raw_user_meta_data`.

### 7.2 🟠 Datos personales (Ley 19.628 / RUT)
Estamos guardando RUT y teléfono de clientes finales. Hace falta, como mínimo: aviso de privacidad en el landing, propósito declarado y una vía para solicitar borrado. Evitar exponer el RUT completo en la pantalla del cajero (mostrar solo los últimos dígitos, como en §5.4).

### 7.3 🟠 Certificados Apple / Google (bloqueante para Dev 1)
`passkit-generator` necesita certificados reales de una cuenta **Apple Developer (USD 99/año)**: Pass Type ID, `.p12` y certificado WWDR. Google Wallet requiere una Service Account de Google Cloud y el alta del Issuer. Sin esto no se puede probar la emisión real ni APNs.
*Mitigación:* arrancar con pases estáticos de prueba y una interfaz `PassProvider` que permita cambiar la implementación después, para que el resto del flujo (`/api/scan`, PWA, landing) avance en paralelo. Los push quedan bloqueados igual.

### 7.4 🟡 Latencia y permisos de cámara en navegador
El escaneo depende de Safari/Chrome, del permiso de cámara y de la luz del local; puede ser más lento que una app nativa.
*Mitigación:* contraste UI fuerte, encuadre guiado y fallback por RUT bien probado. Medir el tiempo real en un local, no en la oficina.

### 7.5 🟡 Gestión de secretos
Hoy los `.env` viven solo en local (están en `.gitignore`, correcto). Falta un `.env.example` versionado por app y un lugar acordado para las llaves de producción antes del despliegue. Con el endpoint de invitación de meseros (§5.6) entra la **`service_role key`** al backend: esa nunca puede terminar en el bundle del frontend.

### 7.6 🟡 Este archivo está en `.gitignore`
**Verificado el 2026-09-20: sigue siendo cierto.** `HANDOFF.md` aparece en `.gitignore` (junto a `node_modules`, `dist`, `.env`, `.agents/`, `.claude/`, …), así que **no viaja por git**: hay que compartirlo por otro medio, o sacarlo del `.gitignore` si queremos que viva en el repo.
**Consecuencia concreta hoy:** las cuatro decisiones del 2026-09-20 **no le llegan a nadie por `git pull`** — hay que pasar el archivo a mano. Decidirlo ya, no "antes de repartir tareas".

### 7.7 🟠 El contador del cliente **baja solo** — riesgo de producto, no técnico
*(Nuevo 2026-09-20. Riesgo asumido y explícito de la decisión 1.)*

Con sellos que vencen y consumo FIFO, el saldo del cliente **disminuye sin que él haga nada**. Y como el pase de la billetera se actualiza por push, **cada caída dispara una actualización del pase que el cliente lee como un castigo**: "me sacaron un sello". Es exactamente lo contrario de la sensación que vende el producto.

*Mitigación:*
- **Avisar antes de que venza, no después.** `PassStampBalance.nextExpiryAt` existe justamente para eso.
- Evitar **push ruidosos**: no notificar cada vencimiento individual ni cada recálculo. Un aviso anticipado y bien redactado, no un goteo.
- Decir la vigencia **desde el principio**, en el landing de emisión y en el pase (§6.2).
- Con `stampValidityDays = null` el problema no existe: es la salida si un local no lo quiere.

No lo escondemos: es el costo consciente de que los sellos generen urgencia. El detalle del aviso sigue sin definir — §8.8.

### 7.8 🟠 Deuda: el panel usa `session.user.id` como `merchantId`
*(Nuevo 2026-09-20.)* Las páginas del panel siguen filtrando por `session.user.id` asumiendo que es el `merchantId`. **Funciona solo mientras el dueño y el comercio comparten id** — y deja de funcionar para cualquier `STAFF`, y para el día en que un usuario pertenezca a más de un comercio. Hay que migrarlas al `merchantId` que entrega la membresía (`MerchantUser`). Es deuda conocida y asumida, no un descubrimiento.

### 7.9 🟠 La sesión del cajero es un punto de falla nuevo
*(Nuevo 2026-09-20.)* Agregar login a la PWA del cajero agrega una forma nueva de que la caja "se caiga": token vencido, refresh fallido, logout accidental en hora punta. Antes esa pantalla no podía fallar por auth porque no tenía auth. Dev 2 tiene que tratar la expiración de sesión como un caso de UX de primera clase (§6.1), no como un error genérico.

---

## 8. Dudas abiertas — decidir en equipo antes de codificar lo afectado

### 8.1 Token estático vs. dinámico
Apple Wallet permite un QR estático por pase. ¿Usamos un `passToken` fijo por cliente (simple, funciona con el pase offline, pero una foto del QR es reutilizable) o lo rotamos (más seguro, exige que el pase se actualice contra el servidor)?
**Impacta:** la validación en `/api/scan` (Dev 1) y la ventana anti-doble-escaneo.
**Recomendación para el MVP:** token estático + ventana de 90 s + registro completo en `Scan`. El fraude posible (un amigo usando tu QR) es de valor económico bajísimo.

### 8.2 ¿Cómo se relaciona un `Pass` con una `Promotion`?
Hoy `Pass` **no tiene `promotionId`**, pero `Promotion` permite varias promociones activas simultáneas por comercio. Cuando llega un escaneo, el backend no tiene forma determinista de saber **qué promoción aplica**.
**Opciones:** (a) restringir a una sola promoción activa por comercio (índice único parcial + validación en el panel), más simple y alineado al MVP; (b) agregar `promotionId` a `Pass` y emitir un pase por promoción, lo que obliga a revisar el `@@unique([customerId, merchantId])`.
**Recomendación:** (a) para el MVP. **Decisión bloqueante para Dev 1.**
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

### 8.6 ❓ ¿Quién construye la landing pública `/` y qué lleva?
*(Abierta 2026-09-20.)* La decisión 2 reserva `/` para una **landing estática explicativa pública**, pero no se definió **quién la hace** (Dev 2 tiene las superficies públicas; Dev 3 tiene hoy `apps/frontend`), **qué contenido lleva**, ni **cuándo** se mueve al sitio estático prerenderizado que motivó el prefijo `/admin/*`. Mientras no se decida, `/` no existe.

### 8.7 ❓ ¿Un `STAFF` puede sellar y canjear?
*(Abierta 2026-09-20 — es la ambigüedad más urgente de la decisión 4.)* El rol `STAFF` se definió como **solo lectura** del saldo + el scanner, y las políticas RLS dejan INSERT/UPDATE/DELETE **solo para `OWNER`**. Pero escanear **escribe** (`Scan` y `Stamp`). Las dos lecturas posibles:
- (a) El `STAFF` nunca escribe directo contra Supabase: `/api/scan` pasa por el backend, que valida la membresía por su cuenta. El RLS restrictivo queda correcto tal cual.
- (b) Hace falta una política de INSERT acotada para `STAFF` sobre `Scan` y `Stamp`.
**Bloquea a Dev 1** (§5.4) y a Dev 3 (política RLS). Relacionado: si vale (a), **dónde ve el `STAFF` el saldo de un cliente** si no puede entrar a `/admin/*` — se asume que dentro del propio `/scan`, pero no está especificado.

### 8.8 ❓ Aviso de vencimiento: antelación, canal y frecuencia
*(Abierta 2026-09-20.)* Está decidido que **un job programado disparará el push de aviso de vencimiento más adelante** y que hay que **avisar antes, no después** (§7.7). No está decidido: **con cuánta antelación**, **por qué canal** (¿solo la actualización del pase en la billetera?), **cada cuánto** se puede avisar sin volverse ruido, ni **quién lo construye**. Sin esto, la mitigación del riesgo 7.7 es una intención, no un plan.

### 8.9 ❓ Nombre del saldo en el contrato de la API
*(Abierta 2026-09-20.)* La respuesta de `/api/scan` sigue llamando `stampsCount` a un valor que ahora sale de `PassStampBalance.activeStamps`. ¿Se renombra el campo en el contrato (más honesto, rompe lo que Dev 2 ya tenga mockeado) o se mantiene el nombre por compatibilidad? ¿Se expone también `nextExpiryAt` para que el cajero pueda decirle al cliente "te vence un sello el jueves"? Decidir **antes** de publicar el Swagger, que es el contrato entre Dev 1 y Dev 2.

---

## 9. Puesta en marcha local

```bash
# Requisitos: Node 22+, pnpm 11, Docker Desktop corriendo
pnpm install

# Levanta Supabase local (API :54321, DB :54322, Studio :54323) y todas las apps en paralelo
pnpm run dev

# Base de datos
pnpm --filter backend exec prisma generate
pnpm --filter backend exec prisma migrate dev     # aplica migraciones
pnpm --filter backend exec prisma studio          # inspeccionar datos
```

**Variables de entorno** (los `.env` no se versionan; pedirlos al equipo):
- `apps/frontend/.env` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `apps/backend/.env` → `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Dev 1 sumará: `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_CERT_P12`, `APPLE_CERT_PASSWORD`, `APPLE_WWDR_CERT`, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`

**Cuenta de prueba del panel:** `adminlocal1@example.com` (Supabase Auth local, rol `OWNER`).
**Cuenta de mesero:** todavía no hay una de prueba. Hasta que exista el endpoint de §5.6, la fila de `MerchantUser` con `role = STAFF` se crea a mano.

---

## 10. Cómo trabajamos

- **Ramas:** `main` (estable) ← `dev` (integración) ← `feature/<nombre>`. Los PR van contra `dev`.
- **CI:** cada PR corre audit, lint (oxlint), typecheck, tests y build. **Un PR con CI rojo no se revisa.**
- **Antes de abrir PR:** `pnpm -r run lint && pnpm -r run typecheck && pnpm -r run test && pnpm -r run build`.
- **Cambios de esquema:** siempre por migración Prisma, nunca SQL suelto contra la base, y avisando en el PR — el panel admin tipa contra esas tablas.
- **Nueva app en el monorepo:** va en `apps/` y debe exponer los scripts `dev`, `build`, `lint`, `typecheck` y `test` para no romper la CI. **Ojo: el scanner NO es una app nueva** — vive en `apps/frontend` bajo `/scan` (decisión 3).
- **Contrato entre Dev 1 y Dev 2:** el Swagger en `/api/docs` es la fuente de verdad. Si un endpoint cambia de forma, se avisa antes de mergear.
- **Dependencias entre personas:** Dev 2 puede avanzar UI y escaneo con mocks; solo la integración final depende de Dev 1. Dev 1 puede construir todo `/api/scan` sin los certificados de Apple. **Lo que sí bloquea de verdad hoy:** sin el endpoint de §5.6 no hay usuarios `STAFF` reales para probar el login del cajero — mientras tanto, crear la fila de `MerchantUser` a mano.
