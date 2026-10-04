# Fidelity Wallet

Plataforma SaaS B2B2C de fidelización para comercios. El cliente obtiene una tarjeta desde un QR público, sin crear una contraseña ni instalar una app. El personal registra compras y canjes desde un escáner web y el dueño administra la tarjeta, sus locales y su equipo.

Este README describe el código integrado en `dev` hasta el PR [#27](https://github.com/TalcaDevs/fidelity-wallet/pull/27), al **4 de octubre de 2026**. No acredita un despliegue productivo ni reemplaza las pruebas en dispositivos reales.

## Estado actual

| Área | Implementado | Pendiente relevante |
| --- | --- | --- |
| Fidelización | Tarjeta por marca de sellos o puntos, bienvenida, vigencia, varias recompensas y canje FIFO transaccional | Anular cargas erróneas con motivo y auditoría |
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
- Una `LoyaltyProgram` por marca define la tarjeta `STAMPS` o `POINTS`. `Promotion` define cada recompensa.
- `Customer` es global. `Pass` es único por cliente y programa y contiene un token aleatorio de 32 bytes para el QR.
- `Stamp` es el libro de saldo: una fila por sello o punto. El saldo se calcula con movimientos vigentes y no consumidos, sin contador persistido.
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
| Wallet | `GOOGLE_WALLET_*`, `APPLE_*`, `ALLOW_MOCK_PASSES` |
| Imágenes | `SUPABASE_PUBLIC_URL` cuando el origen público de Storage difiere del interno |
| Frontend | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` |
| Legal y contacto | `VITE_LEGAL_*`, `VITE_SUPPORT_EMAIL`, `VITE_SUPPORT_WHATSAPP` |
| Facturación demo | `VITE_FEATURE_BILLING` |

La `service_role key` y las claves privadas de Wallet viven **solo en el backend**, nunca en variables `VITE_*`. `SCAN_VALIDATION_SECRET` es obligatoria en producción y debe coincidir entre instancias. Desactiva los mocks antes de producción y no definas `GOOGLE_WALLET_CLASS_ID` allí, porque forzaría una clase compartida entre marcas.

Google Wallet necesita imágenes con URLs HTTPS públicas. `ALLOW_MOCK_PASSES=true` permite desarrollo sin credenciales: el pase Apple simulado es JSON, no una tarjeta instalable, y la URL Google simulada no lleva firma válida.

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
