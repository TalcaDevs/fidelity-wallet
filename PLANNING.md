# 🗺️ Planificación General del Proyecto — Fidelity Wallet

> **Documento de Planificación y Roadmap de Desarrollo**
> Basado en la arquitectura y acuerdos de `HANDOFF.md` y el estado actual del repositorio.
> **Última actualización:** 2026-09-21 · **Ramas:** `main` (prod) ← `dev` (integración)

---

## 📌 1. Visión Ejecutiva y Estado Actual

**Fidelity Wallet** es una plataforma SaaS B2B2C de fidelización sin fricción (cero apps y cero contraseñas para el cliente final), apalancada en pases nativos de **Apple Wallet** y **Google Wallet**.

Actualmente el proyecto avanza en **3 frentes de desarrollo concurrentes**:
- **Dev 1 (Backend & Motor de Pases):** API NestJS, generación de `.pkpass` / Google JWT, lógica transaccional de sellado FIFO y notificaciones push.
- **Dev 2 (Frontend Cliente & PWA Caja):** Landing de captación `/join/:merchantId` y escáner de caja en `/scan`.
- **Dev 3 (Infraestructura, Base de Datos & Panel Admin):** Modelado relacional, RLS multi-tenant (`OWNER`/`STAFF`), migraciones Prisma y panel web bajo `/admin/*`.

```
                               ┌──────────────────────────────────────────────────┐
                               │                 CLIENTE FINAL                    │
                               │  Apple / Google Wallet (Pase criptográfico)      │
                               └───────────────────────┬──────────────────────────┘
                                                       │ Muestra QR (passToken)
                                                       ▼
┌──────────────────────────────┐       POST /api/scan  ┌──────────────────────────┐
│  LANDING ADQUISICIÓN (Dev 2) ├──────────────────────►│  PWA ESCÁNER CAJA (Dev 2)│
│  /join/:merchantId           │                       │  apps/frontend -> /scan  │
└──────────────┬───────────────┘                       └───────────┬──────────────┘
               │ POST /api/customers                               │ Sesión STAFF
               ▼                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          API REST NESTJS (Dev 1)                                │
│       Reglas de Negocio · Motor PassKit / Googleapis · Push APNs / Google       │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ Prisma
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL + Auth + RLS)                           │
│     Única Fuente de Verdad · Tablas Merchant, Stamp, Pass, Scan · Roles         │
└──────────────────────────────────────▲──────────────────────────────────────────┘
                                       │ Supabase Client (Anon Key)
                                       │
┌──────────────────────────────────────┴──────────────────────────────────────────┐
│                      PANEL DE ADMINISTRACIÓN (Dev 3)                            │
│           apps/frontend -> /admin/* (Dashboard, Promociones, Clientes)          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 2. Matriz de Estado de Entregables (Lo que tenemos hecho vs. Lo que falta)

| Componente / Hito | Responsable | Estado | Detalle técnico |
|---|---|---|---|
| **Estructura Monorepo & CI** | Dev 3 | ✅ 100% | pnpm workspaces, scripts raíz, GitHub Actions (audit, lint, typecheck, tests, build). |
| **Modelado BD & Migraciones** | Dev 3 | ✅ 100% | Tablas `Merchant`, `MerchantUser`, `Promotion`, `Customer`, `Pass`, `Stamp`, `Scan`, enum `MerchantRole` y vista `PassStampBalance`. |
| **Seguridad RLS & Roles** | Dev 3 | ✅ 95% | Políticas por operación (`OWNER` vs `STAFF`), `security_invoker = true` en vistas, trigger `handle_new_user` seguro. *(Pendiente: fail-closed en hook).* |
| **Panel Admin (`/admin/*`)** | Dev 3 | ✅ 90% | Login, Dashboard con KPIs en vivo, módulo CRUD de promociones, listado de clientes con enmascaramiento, configuración de vigencia de sellos. |
| **Landing Pública (`/`)** | Dev 3 | ✅ 100% | Página de marketing explicativa, responsive, soporte Dark Mode, enlaces de acceso. |
| **Fundaciones Backend NestJS** | Dev 1 | 🔴 5% | Solo boilerplate NestJS inicial. Falta PrismaModule, DTOs, filtros y Swagger. |
| **Endpoints Core (`/api/*`)** | Dev 1 | 🔴 0% | Pendientes: `/api/customers`, `/api/passes/generate`, `/api/scan`, `/api/merchants/staff/invite`. |
| **Motor de Pases & Push** | Dev 1 | 🔴 0% | Pendientes: `passkit-generator`, `googleapis`, certificados Apple Developer y APNs. |
| **PWA del Cajero (`/scan`)** | Dev 2 | 🟡 15% | Ruta reservada con placeholder funcional; falta motor de cámara, offline y sesión de cajero. |
| **Landing Emisión (`/join/:id`)**| Dev 2 | 🟡 15% | Ruta reservada con placeholder funcional; falta formulario RUT/teléfono y botones Wallet. |

---

## 🛠️ 3. Plan Detallado por Frente de Desarrollo

---

### 🔹 FRENTE 1: Dev 1 — Backend & Motor de Pases (`apps/backend`)

El backend es el **custodio de las llaves privadas y las reglas de negocio transaccionales**. Ningún cliente firma pases ni decide unilateralmente si un sello es válido.

#### Fase 1.1: Fundaciones y Arquitectura Base (Días 1 a 2)
- [ ] Configurar `PrismaModule` y `PrismaService` global conectado a la base de datos de Supabase.
- [ ] Implementar `ValidationPipe` global con `class-validator` y `class-transformer`.
- [ ] Implementar filtro global de excepciones para respuestas de error homogéneas (`{ statusCode, message, error, timestamp }`).
- [ ] Configurar Swagger en `/api/docs` con esquemas DTO documentados (contrato vivo para Dev 2).
- [ ] Configurar CORS permitiendo los orígenes de la aplicación frontend.

#### Fase 1.2: Endpoints Transaccionales de Clientes y Pases (Días 3 a 5)
- [ ] **`POST /api/customers`**:
  - Normalización estricta de RUT (limpieza de puntos, mayúscula en DV, validación de Módulo 11) y teléfonos (+569...).
  - Idempotencia: búsqueda o creación de `Customer` y generación de `Pass` con `passToken` criptográfico único.
- [ ] **`POST /api/merchants/staff/invite`**:
  - Endpoint protegido para `OWNER`.
  - Creación de usuario en Supabase Auth mediante `service_role key` con metadata `{ merchant_id, role: 'STAFF' }`.

#### Fase 1.3: El Núcleo Transaccional: `POST /api/scan` (Días 6 a 8)
- [ ] Resolver `passToken` → `Pass`. Validar coincidencia de `merchantId` (403 si es de otro local).
- [ ] **Mecanismo Anti-fraude:** Ventana de 90 segundos para evitar doble escaneo accidental (`alreadyScanned: true`).
- [ ] **Acción `STAMP` (Transacción Serializable / Row Locks):**
  - Insertar registro en `Scan` con `type = STAMP_ADDED` y `createdByUserId`.
  - Crear fila en `Stamp` calculando `expiresAt = now() + stampValidityDays` (congelado).
  - Consultar `PassStampBalance.activeStamps`: si alcanza `targetStamps`, reportar `rewardUnlocked = true`.
- [ ] **Acción `REDEEM` (Consumo FIFO):**
  - Validar que `activeStamps >= targetStamps`.
  - Consumir mediante `UPDATE` con `consumedAt = now()` y `consumedByScanId` los **`targetStamps` sellos más antiguos** (`ORDER BY earnedAt ASC`).
  - Insertar `Scan` con `type = REWARD_REDEEMED`.
- [ ] Desacoplar la respuesta del escaneo de los envíos de notificaciones push (ejecución asíncrona en background).

#### Fase 1.4: Motor de Generación Criptográfica y Push (Días 9 a 12)
- [ ] Integrar `passkit-generator` para compilar y firmar `.pkpass` (Apple).
- [ ] Integrar `googleapis` para generar JWTs de Google Wallet.
- [ ] Implementar endpoints del protocolo de Apple PassKit (`/v1/devices/...`).
- [ ] Conectar servicio APNs y Google Wallet API para actualizar el saldo visual en el celular tras cada sello o canje.

---

### 🔹 FRENTE 2: Dev 2 — PWA del Cajero y Experiencia del Cliente (`apps/frontend`)

Las dos superficies que interactúan en el mundo real. Ambas se integran dentro de `apps/frontend`.

#### Fase 2.1: Landing de Adquisición `/join/:merchantId` (Días 1 a 4)
- [ ] Consumir datos del comercio (nombre, logo, promoción activa y vigencia de sellos).
- [ ] Formulario mobile-first optimizado para 4G:
  - Input de RUT chileno (con formateo dinámico) o Teléfono.
  - Validación en cliente previa al envío.
- [ ] Integrar llamada a `POST /api/customers` y luego `POST /api/passes/generate`.
- [ ] Detección de dispositivo (iOS vs Android) para priorizar:
  - Botón oficial "Add to Apple Wallet".
  - Botón oficial "Add to Google Wallet".
- [ ] Mensaje legal explícito sobre Ley 19.628 de protección de datos personales.

#### Fase 2.2: PWA del Cajero `/scan` (Días 5 a 9)
- [ ] **Autenticación y Persistencia:**
  - Login específico para personal (`STAFF` u `OWNER`).
  - Gestión proactiva de sesión y refresh de token JWT para evitar caducidad durante turnos largos.
- [ ] **Motor de Escaneo:**
  - Integración de lector de cámara con `@zxing/library` o `html5-qrcode`.
  - Objetivo: lectura y decodificación en menos de 2 segundos.
  - Feedback háptico (vibración) y sonoro (bips de éxito/error).
- [ ] **Estados de Pantalla (Alto Contraste):**
  - ✅ **Sello añadido:** Indicador numérico gigante (ej. `4 / 5`).
  - 🎁 **Premio desbloqueado:** Interfaz llamativa con confirmación obligatoria para canjear.
  - ⚠️ **Pase inválido / Otro local:** Bloqueo rojo con advertencia clara.
  - 🔁 **Doble escaneo:** Advertencia amarilla ("Ya registrado hace instantes").
- [ ] **Modo Fallback Manual:** Búsqueda y selección manual por RUT/teléfono para cuando la cámara o pantalla del cliente falle.
- [ ] Configuración de PWA instalable (`manifest.json` y Service Worker).

---

### 🔹 FRENTE 3: Dev 3 — Infraestructura, DB & Panel de Control (`apps/frontend` & `backend/prisma`)

Garantizar la integridad de los datos, la seguridad en base de datos y la administración para dueños de local.

#### Fase 3.1: Estabilización y Cierre de Deuda Técnica (Días 1 a 2)
- [ ] **Corregir Fail-Open en `useMembership.ts`:**
  - En caso de error o falla al consultar `MerchantUser`, asignar `role: null` o estado de error explícito (Fail-Closed). No otorgar `OWNER` por defecto.
- [ ] **Consumo Limpio de `merchantId`:**
  - Asegurar que `Settings.tsx`, `Customers.tsx` y `Dashboard.tsx` consuman `membership.merchantId` desde el contexto global en lugar de asumir `session.user.id`.
- [ ] **Consolidar Migraciones de Vigencia:**
  - Refundir las migraciones de `stampValidityDays` para que el esquema nazca limpio en `Merchant`.

#### Fase 3.2: Módulo de Gestión de Personal / Meseros (Días 3 a 5)
- [ ] Crear vista dentro de `/admin/settings` o subsección `/admin/team` para listar miembros (`MerchantUser`).
- [ ] Formulario de invitación de cajeros conectado al endpoint de Dev 1 (`/api/merchants/staff/invite`).
- [ ] Capacidad del dueño para revocar accesos (`DELETE` en `MerchantUser`).

#### Fase 3.3: Métricas Avanzadas y Resiliencia en Producción (Días 6 a 8)
- [ ] Configurar rewrite de SPA en el servidor de despliegue (evitar errores 404 en deep links a `/admin/*` o `/join/*`).
- [ ] Ampliar métricas del Dashboard: gráficos de tasa de retorno, clientes en riesgo de vencimiento de sellos (`nextExpiryAt`).
- [ ] Plantillas de `.env.example` en raíz y sub-proyectos.

---

## 📅 4. Cronograma y Sincronización entre Equipos (Gantt Conceptual)

```
Semanas / Días:           |  Semana 1 (D1-D5)  |  Semana 2 (D6-D10) |  Semana 3 (D11-D15) |
--------------------------|--------------------|--------------------|---------------------|
DEV 1 (Backend & Pases)   |                    |                    |                     |
  - Fundaciones & Swagger | [====]             |                    |                     |
  - /api/customers & scan |        [=====]     |                    |                     |
  - Invite STAFF          |              [===] |                    |                     |
  - Motor PassKit & Google|                    |      [=======]     |                     |
  - APNs / Push Updates   |                    |            [=====] |                     |
                          |                    |                    |                     |
DEV 2 (PWA & Clientes)    |                    |                    |                     |
  - Landing /join/:id     |      [=======]     |                    |                     |
  - Escáner /scan (UI/Cam)|                    | [========]         |                     |
  - Fallback manual & PWA |                    |         [====]     |                     |
  - Integración con API   |                    |                    |    [=====]          |
                          |                    |                    |                     |
DEV 3 (Infra & Admin)     |                    |                    |                     |
  - Fix Fail-Open & RLS   | [==]               |                    |                     |
  - Inyección merchantId  |   [==]             |                    |                     |
  - UI Gestión de Staff   |                    |      [=====]       |                     |
  - Testing E2E & Prod    |                    |                    |        [====]       |
--------------------------|--------------------|--------------------|---------------------|
HITOS DE INTEGRACIÓN:     |   ★ Contrato API   |   ★ Escaneo Local  |   ★ Flujo Completo  |
```

---

## 🚦 5. Puntos de Decisión Bloqueantes (Acuerdos Requeridos)

1. **Relación `Pass` vs `Promotion` (§8.2 de HANDOFF):**
   - *Decisión recomendada para el MVP:* **Una sola promoción activa por local.** Simplifica `/api/scan` al no tener que desambiguar qué promoción aplica.
2. **Escritura del Escáner (§8.7 de HANDOFF):**
   - *Decisión acordada:* El `STAFF` **no escribe directo a Supabase**. Todo escaneo viaja por `POST /api/scan` autenticado en NestJS con la `service_role key`. El RLS de solo lectura para `STAFF` en PostgreSQL se mantiene íntegro.
3. **Contrato de Saldo en la API (§8.9 de HANDOFF):**
   - En la respuesta de `/api/scan`, el campo de saldo se llamará **`activeStamps`** (reflejando la vista `PassStampBalance`) y se devolverá además **`nextExpiryAt`** para que el cajero informe al cliente sobre vencimientos inmediatos.

---

## 🎯 6. Criterio de Éxito del MVP (Definition of Done Global)

El MVP se considerará terminado y listo para producción cuando se cumpla el siguiente **flujo continuo sin fallas**:

1. Un dueño crea su cuenta en `/admin/login`, configura su local en `/admin/settings` con vigencia de sellos a 60 días, y define la regla: *"Por cada 5 compras, 1 café gratis"*.
2. El dueño invita a un mesero desde el panel; el mesero recibe la invitación e inicia sesión en la PWA `/scan`.
3. Un cliente escanea el QR del mostrador en su teléfono físico, ingresa su RUT en `/join/:merchantId` y añade en 10 segundos su pase a **Apple Wallet** o **Google Wallet**.
4. El mesero escanea el pase del cliente desde `/scan`. En menos de 2 segundos la pantalla confirma el sello añadido (`1 / 5`) y el pase del cliente vibra y se actualiza automáticamente.
5. Tras 5 visitas, el pase notifica *"¡Premio desbloqueado!"*, el mesero confirma el canje en caja y los 5 sellos más viejos pasan a consumidos (FIFO).
6. El dueño revisa en `/admin/dashboard` el canje reflejado en las métricas en tiempo real.
