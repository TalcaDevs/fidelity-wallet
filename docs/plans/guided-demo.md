# Demo guiada del comercio

## Objetivo
Convertir `/demo` en una experiencia comercial breve: personalizar una tarjeta, atender una compra, entregar un premio y explorar su efecto en el panel. Cliente y comercio tienen superficies visuales diferentes; cada acción ocurre dentro de la vista correspondiente.

## Evidencia y alcance
La primera demo (`Demo.tsx`, `DemoMerchant.tsx`) usa datos ficticios en memoria. Reutilizamos `PublicFrame`, tokens Wallet y las métricas de `Dashboard.tsx` (pases, cargas, canjes). La ficha se inspira en `CustomerDetail.tsx`. No hay API nueva ni sincronización entre dispositivos ni emisión Wallet.

## Diseño
- Dos superficies: teléfono del cliente con tarjeta personalizable y terminal del comercio con caja/panel.
- Secuencia explícita: personalización, presentar QR, lectura, confirmar compra, elegir premio, confirmar entrega, métricas/ficha.
- Animación de lectura, entrada de vistas, sello y premio. Movimiento reducido y pausa manual; las animaciones no condicionan operaciones reales.
- Un solo estado del recorrido determina saldo, métricas e historial. Reinicio cancela cualquier lectura pendiente.
- En móvil, acceso a cada vista y traslado del foco a la acción guiada.

## Aceptación y verificación
Personalización visible, compra imposible antes de identificar tarjeta, saldo 4 → 5 → 0, contadores incrementados una vez, ficha e historial coherentes, reinicio sin eventos tardíos. Probar recorrido, navegación y movimiento reducido con Testing Library; lint, tipos y build. Verificar navegador cuando esté disponible, aclarando límites.

## Avance
Completado: composición teléfono/terminal, personalización de nombre y tres estilos, lector con temporizador cancelable, acciones en cada vista, animaciones, pausa manual, foco guiado y vistas móviles. Panel final con métricas/ficha/historial consistente. Reinicio conserva la identidad visual y limpia el recorrido.

Validación: lint sin errores (advertencias previas fuera de la demo), typecheck, build y tres pruebas de comportamiento aprobadas: recorrido con personalización/foco/saldos/métricas, reinicio durante lectura y recorrido con animaciones pausadas/cambio de vista. `/demo` responde HTTP 200 en el servidor local. Build conserva advertencias de configuración Vite y tamaño del bundle principal.

Pendiente: validación visual en escritorio, tablet y móvil. El host de navegador no está disponible; el intento mediante Chrome nativo se detuvo porque Computer Use no pudo verificar con confianza la URL actual en Windows. No se acreditan pruebas visuales ni integración de cámara/Wallet.

## Preparación del PR

Rama `feat/guided-commerce-demo` basada en `dev`, con solo los cambios de la demo. Instalación con lockfile congelado, shared compilado y cliente Prisma regenerado para la base actual.

- `pnpm -r run lint`, `pnpm -r run typecheck`, `pnpm -r run build`: aprobados, con advertencias existentes.
- `pnpm -r run test`: 47 pruebas de shared, 690 de backend y 549 de frontend aprobadas.
- Auditoría de producción con los parámetros de CI: aprobada.
- `pnpm --filter backend run test:db` contra Supabase local `127.0.0.1:54322`: 5 aprobadas y 54 fallidas. La BD local está desactualizada respecto de `dev` (por ejemplo, falta `Scan.voidedAt`). No se modificó ni reseteó su esquema; la verificación desde cero corresponde al job de BD de CI.
