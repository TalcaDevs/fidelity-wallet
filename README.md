# Fidelity Wallet

Plataforma SaaS B2B2C de fidelización para comercios. El cliente obtiene una tarjeta desde un QR público, sin crear una contraseña ni instalar una app. El personal registra compras y canjes desde un escáner web y el dueño administra la tarjeta, sus locales y su equipo.

Este README describe el código de esta revisión, incluida la corrección de modalidades al **7 de octubre de 2026**. No acredita un despliegue productivo ni reemplaza las pruebas en dispositivos reales.

## Estado actual

| Área | Implementado | Pendiente relevante |
| --- | --- | --- |
| Fidelización | Tarjeta por marca de sellos, puntos o ambos; cambio de modalidades conservando saldo, bienvenida por moneda, vigencia, varias recompensas y canje FIFO transaccional | Anular cargas erróneas con motivo y auditoría |
| Alta y caja | Alta atómica con teléfono o correo, registro configurable, validación previa HMAC, QR e ingreso manual, monto y foto de boleta | Recuperación segura del pase y pruebas prolongadas en dispositivos |
| Panel | Editor de tarjeta, clientes e historial, equipo, locales, reportes y soporte | Selección del local para un dueño con varias sucursales y reportes pendientes |
| Google Wallet | Emisión JWT firmada, publicación del diseño y actualización del saldo por OAuth2/PATCH | Reintentos durables, invalidación al borrar un pase y validación de cercanía en terreno |
| Apple Wallet | Generador con `passkit-generator` y descarga `.pkpass` con certificados configurados | Certificados reales, assets, web service PassKit, registros de dispositivos y APNs. Sin validación real en iPhone |
| Suscripciones | Catálogo de planes, prueba de 30 días, límites en backend y asignación manual por marca | Cobro, pasarela, conciliación, documentos tributarios y precios definitivos. Facturación es un mockup opcional |
| Cloud | Configuración de orígenes y URLs, controles de producción y CI de validación | Deploy HTTPS, secretos, backups, monitoreo y pipeline de release |

Los avisos de cercanía dependen de los permisos y del comportamiento de la billetera. Actualizar un saldo no acredita una notificación visible. Invitación de personal y recuperación de contraseña usan Supabase Auth. No hay un servicio propio de email transaccional o campañas.

## Arquitectura actual

Monorepo **pnpm**, con un **backend modular** y una sola aplicación web. El código actual no usa Next.js ni microservicios.

| Componente | Stack y responsabilidad |
| --- | --- |
| `apps/frontend` | React 19, Vite, Tailwind 4, React Router 7. Landing, panel, PWA del escáner y panel interno |
| `apps/backend` | NestJS 12 en ESM, Prisma 6. API REST, reglas de fidelización, pases, reportes, soporte y permisos |
| `packages/shared` | Contratos, catálogo de planes y validadores compartidos. Se compila antes de las apps |
| Supabase | PostgreSQL, Auth y Storage. RLS por membresía |
| Wallet | Google Wallet API y generador Apple. Solo Google participa hoy en el despacho de actualizaciones |

La mayor parte de los flujos usa `/api/*`. El dashboard y algunas consultas de clientes todavía leen tablas directamente mediante `supabase-js`, con RLS. Los trabajos de publicación y actualización de pases se coordinan en memoria, sin una cola durable ni outbox.

### Modelo de datos y permisos

- `Brand` es la marca. `Merchant` es un local y conserva su nombre de tabla para mantener compatibilidad con RLS y QR existentes.
- Una `LoyaltyProgram` por marca define las modalidades con `stampsEnabled` y `pointsEnabled`; `type` conserva la modalidad principal por compatibilidad. `Promotion.currency` define la moneda de cada recompensa.
- `Customer` es global. `Pass` es único por cliente y programa y contiene un token aleatorio de 32 bytes para el QR.
- `Stamp` es el libro de saldo: cada movimiento tiene `currency` y `amount`. El saldo suma cantidades vigentes y no consumidas de modalidades activas, sin contador persistido. Ocultar una modalidad conserva sus movimientos y vencimientos; reactivarla recupera el saldo que aún siga vigente.
- `Scan` registra las cargas y canjes. La foto de boleta vive en Storage privado y `ScanReceipt`, separada de los datos que lee el cajero.
- `BrandMember` determina los permisos `OWNER` y `STAFF`. El personal queda restringido a su local en backend y RLS.
- `PlatformAdmin` y `AuditLog` sostienen el panel interno. Las notas internas de soporte no se exponen al dueño.

## Flujos y rutas

| Ruta | Uso | Acceso |
| --- | --- | --- |
| `/`, `/terminos`, `/join/:slug` | Landing, términos y alta | Público |
| `/scan` | Validar cliente, confirmar compra o canjear | `STAFF` u `OWNER` |
| `/admin/login`, `/admin/reset` | Acceso y recuperación | Público |
| `/admin/dashboard`, `/admin/analytics`, `/admin/customers`, `/admin/card` | Gestión de fidelización | `OWNER` |
| `/admin/team`, `/admin/locations`, `/admin/support`, `/admin/settings` | Operación del comercio | `OWNER` |
| `/admin/billing` | Mockup de suscripción | `OWNER`, solo con `VITE_FEATURE_BILLING=true` |
| `/internal/*` | Gestión interna y soporte | `PlatformAdmin` |

1. El cliente abre `/join/:slug`, entrega teléfono o correo y acepta los términos. La tarjeta define qué otros datos pedir.
2. El alta crea el pase de forma atómica. Los enlaces de billetera se entregan solo en la primera emisión pública para evitar que conocer un teléfono permita recuperar una tarjeta ajena.
3. El personal escanea o busca al cliente. `/api/scan/validate` devuelve un comprobante HMAC de 10 minutos y datos enmascarados.
4. `/api/scan` confirma la compra. En sellos aplica el límite diario de Chile o la espera configurada. En puntos calcula `floor(monto / pesosPerPoint)` y exige foto de boleta al `STAFF`.
5. El canje descuenta el costo de la recompensa con FIFO y bloqueo transaccional del pase. El saldo sirve entre locales de la misma marca.
6. El backend solicita la actualización de Google Wallet en segundo plano. Una falla externa hoy queda en logs y no tiene reintento durable.

El cambio de modalidades se permite aunque existan tarjetas y saldos. No convierte premios ni saldos entre monedas. La carga manual del panel elige una moneda; en caja, una tarjeta dual acumula sellos y puntos según sus reglas independientes. Las bienvenidas `welcomeStamps` y `welcomePoints` también son independientes. El error productivo `property pointsEnabled should not exist` requiere desplegar la API compilada con el DTO compatible, no retirar el campo del formulario. Para este cambio, aplicar primero las migraciones `20261006150000_loyalty_currency_balances` y `20261006160000_card_mutations_backend_only`, después el backend con shared compilado y finalmente el frontend.

El cupo de premios disponibles depende del plan: Prueba e Inicial, 3; Pro, 5; Negocio, 10. El backend permite configurar cada cupo con `CARD_REWARDS_LIMIT_TRIAL`, `CARD_REWARDS_LIMIT_STARTER`, `CARD_REWARDS_LIMIT_PRO` y `CARD_REWARDS_LIMIT_BUSINESS` (enteros de 1 a 20; requieren reinicio). Cuenta el total de premios de modalidades activas; los ocultos se conservan sin ocupar cupo. Un plan o límite menor conserva los premios que ya estaban disponibles, pero impide aumentar su cantidad. La API devuelve el cupo efectivo al editor; el catálogo comercial muestra valores de referencia. Se conserva un tope técnico de 40 premios guardados, incluidos los ocultos.

Las escrituras de `LoyaltyProgram` y `Promotion` pasan por la API: se retiraron grants antiguos de Supabase que permitían modificar reglas o premios directamente y saltarse los cupos, bloqueos y auditoría. Las lecturas del panel conservan sus grants y RLS.

La moneda de un premio existente se conserva incluso si un cliente anterior omite `currency`; cambiarla exige crear otro premio. Las bienvenidas por moneda registran sus valores anteriores y posteriores en auditoría. Las métricas históricas de sellos vencidos mantienen sus cantidades al ocultar o reactivar modalidades.

## Desarrollo local

Requisitos: **Node.js 22.13 o superior**, **pnpm 11**, Docker Desktop en ejecución y Supabase CLI mediante los scripts del proyecto. El flujo utiliza Supabase. El `docker-compose.yml` de PostgreSQL aislado no reemplaza Auth ni Storage.

```bash
git clone https://github.com/TalcaDevs/fidelity-wallet.git
cd fidelity-wallet
git switch dev
pnpm install --frozen-lockfile
```

Copia `apps/backend/.env.example` a `apps/backend/.env` y `apps/frontend/.env.example` a `apps/frontend/.env`. Levanta Supabase y consulta las URL y claves locales para completar ambos archivos:

```bash
pnpm run supabase:start
npx supabase status
pnpm --filter @fidelity/shared build
pnpm --filter backend exec prisma generate
pnpm --filter backend exec prisma migrate deploy
pnpm run dev
```

Supabase local expone API en `54321`, PostgreSQL en `54322` y Studio en `54323`. La web usa `5173` y la API `3000`. El prefijo del backend es `/api`. Swagger está en `/api/docs` solo en desarrollo o con `ENABLE_SWAGGER=true`.

El seed es opcional y **solo para desarrollo**:

```bash
pnpm --filter backend run seed
```

Consulta [HANDOFF.md](HANDOFF.md) para cuentas demo, pruebas y problemas conocidos de Storage. No uses el seed ni sus credenciales en producción.

### Variables de entorno

| Entorno | Variables principales |
| --- | --- |
| Backend | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKEND_URL`, `ALLOWED_ORIGINS` |
| Escáner | `SCAN_VALIDATION_SECRET`, `STAMP_COOLDOWN_MINUTES`, `OWNER_MAX_STAMPS_PER_LOAD` |
| Premios por plan | `CARD_REWARDS_LIMIT_TRIAL`, `CARD_REWARDS_LIMIT_STARTER`, `CARD_REWARDS_LIMIT_PRO`, `CARD_REWARDS_LIMIT_BUSINESS` |
| Wallet | `GOOGLE_WALLET_*`, `APPLE_*`, `ALLOW_MOCK_PASSES` |
| Imágenes | `SUPABASE_PUBLIC_URL` cuando el origen público de Storage difiere del interno |
| Frontend | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` |
| Auth local | `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` (OAuth Google local) |
| Legal y contacto | `VITE_LEGAL_*`, `VITE_SUPPORT_EMAIL`, `VITE_SUPPORT_WHATSAPP` |
| Facturación demo | `VITE_FEATURE_BILLING` |

La `service_role key` y las claves privadas de Wallet viven **solo en el backend**, nunca en variables `VITE_*`. `SCAN_VALIDATION_SECRET` es obligatoria en producción y debe coincidir entre instancias. Desactiva los mocks antes de producción y no definas `GOOGLE_WALLET_CLASS_ID` allí, porque forzaría una clase compartida entre marcas.

Google Wallet necesita imágenes con URLs HTTPS públicas. `ALLOW_MOCK_PASSES=true` permite desarrollo sin credenciales: el pase Apple simulado es JSON, no una tarjeta instalable, y la URL Google simulada no lleva firma válida.

### Google OAuth local

Para habilitar el inicio de sesión con Google en Supabase local:
1. Crea credenciales OAuth 2.0 en Google Cloud Console con la URI de redirección autorizada: `http://127.0.0.1:54321/auth/v1/callback`.
2. Define `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` y `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` en las variables de entorno locales (mantén las credenciales fuera del repositorio).
3. En `supabase/config.toml`, cambia `enabled = true` en la sección `[auth.external.google]`.
4. Verifica que `auth.site_url` apunte al frontend (`http://localhost:5173`) y que `auth.additional_redirect_urls` incluya `http://localhost:5173/**` y `http://127.0.0.1:5173/**` para permitir el retorno autorizado al panel `/admin` contemplando query parameters (ej. `?redirect=...`).
5. Reinicia Supabase local (`pnpm run supabase:start` o `npx supabase stop && npx supabase start`).

### Pruebas en móvil

```bash
pnpm --filter frontend dev:lan
cloudflared tunnel --url http://localhost:5173
```

Para cámara e imágenes accesibles desde Internet, configura la URL HTTPS del túnel en `BACKEND_URL` y, si corresponde al proxy de Storage, `SUPABASE_PUBLIC_URL`. Reinicia el backend. El túnel local no constituye un deploy productivo.

## Calidad y contribuciones

Los PR de funcionalidades van contra `dev`. `main` todavía conserva el estado inicial y no debe asumirse como una versión productiva actual.

```bash
pnpm -r run lint
pnpm -r run typecheck
pnpm -r run test
pnpm -r run build
```

Con Supabase local disponible:

```bash
pnpm --filter backend run test:db
```

La CI valida dependencias de producción, lint, tipos, tests y build, además de migraciones, RLS y triggers en una base nueva. El test e2e del backend sigue siendo el ejemplo de NestJS y no acredita el recorrido completo del cliente.

Todo cambio de esquema requiere migración Prisma. Los contratos comunes y validadores van en `packages/shared`. Quien cambie una decisión o un pendiente actualiza también el handoff.

## Pendientes para un MVP cloud con Apple Wallet

- Deploy web y API con HTTPS estable, Storage, secretos, pipeline de release, rollback, backups y monitoreo.
- Apple Wallet real: Pass Type ID, certificados y WWDR, imágenes, servicio de actualización PassKit, registros por dispositivo y APNs. Probar alta, saldo, canje y cámara en Safari/iPhone.
- Persistir y reintentar actualizaciones de billetera. Invalidar pases externos al borrar datos y actualizar el saldo cuando vence sin un nuevo escaneo.
- Recuperación segura del pase, correos de producción y corrección auditada de cargas erróneas.
- Moneda, precios, IVA y documentos tributarios. Integrar pagos si el MVP incluye cobro automático. El catálogo contiene precios de referencia, no una oferta cerrada.
- Datos legales y términos revisados para puntos, límite diario, saldo entre locales, tratamiento de datos y fotos de boletas.
- Validar aislamiento entre marcas, flujo completo, sesiones prolongadas, dispositivos reales y restauración de backups antes del piloto.

Esta lista refleja brechas actuales. Proveedor cloud, presupuesto y fecha de lanzamiento siguen pendientes de decisión.

## Referencias del proyecto

- [HANDOFF.md](HANDOFF.md): reglas vigentes, decisiones y guía operativa.
- [Modelo Prisma](apps/backend/prisma/schema.prisma): entidades y relaciones.
- [Contratos compartidos](packages/shared/src): tarjeta, planes y soporte.
- [CI](.github/workflows/pr-checks.yml): verificaciones requeridas.
- Swagger `/api/docs`: contratos cuando está habilitado.

El código, las migraciones y los contratos son la evidencia de implementación. La documentación debe acompañar sus cambios.
