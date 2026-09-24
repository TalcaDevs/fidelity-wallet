### 📌 Contexto y Motivación
Este PR resuelve varias tareas pendientes documentadas en el Handoff relativas al rol de Dev 2:
1. Configuración de la PWA del frontend para ser instalable.
2. Manejo de desconexiones (Sesión vencida vs caída de red) para que los dispositivos que pasan horas con la pantalla apagada (ej. tablets de caja) refresquen su sesión automáticamente y no devuelvan errores 401 en el cajero.
3. Incorporación de assets visuales oficiales de las billeteras (Apple y Google Wallet) en la pantalla de alta exitosa.
4. Cobertura de tests para el componente de escáner (`QRCam`) y el flujo de alta (`Join`), respetando la regla interna de no usar mocks de Vitest (`vi.fn`) para el ciclo de red y dependencias globales.

### 🛠️ Cambios Principales
*   **PWA Instalable:** Se generaron y agregaron los íconos adaptativos (`192x192` y `512x512`) y se integró el manifiesto en `vite.config.ts` y en los metadatos de `index.html` (nombrada "Fidelity Wallet" con modo oscuro activo).
*   **Gestión Resiliente de Sesión:** 
    *   Se agregó un *listener* al evento `visibilitychange` en `useAuth.ts` para invocar automáticamente `supabase.auth.refreshSession()` al volver al primer plano.
    *   Se implementó lógica de reintento automático en `scanService.ts`. Si el fetch devuelve `401`, intercepta, refresca el token transparente y vuelve a ejecutar el request.
*   **Badges de Wallet:** Se sustituyeron los botones genéricos por los badges oficiales `.svg` (versión español de LatAm) para Apple Wallet y Google Wallet en `JoinSuccess.tsx`.
*   **Pruebas (Tests):**
    *   Se creó `Join.test.tsx` con un interceptor mock nativo de `window.fetch` para probar validaciones obligatorias (como el checkbox de términos), manejo de errores de red y locales sin promociones.
    *   Se creó `QRCam.test.tsx` para certificar que el ciclo asíncrono asilado `start`/`stop` de `html5-qrcode` gestiona bien sus colas, evitando choques si React ejecuta renderizados dobles por `StrictMode`.

### 🧪 Cómo probar / Verificar
*   **Paso 1:** Inicia el servidor local y verifica que el navegador ofrezca el botón para instalar la PWA (app icon en barra de direcciones).
*   **Paso 2:** Simula el alta completando los datos en `/join/cafe-demo`. Confirma que la vista final muestra los logos y badges oficiales de Apple y Google.
*   **Paso 3:** Para probar la cámara, accede como comercio. Si usas tu PC, asegúrate de utilizar localhost; en un teléfono externo, prueba a través de tu túnel `ngrok` (requiere HTTPS).
*   **Paso 4:** Ejecuta los tests con `pnpm vitest run`. Deberían pasar todos de manera local.

### ✅ Checklist
- [x] El código sigue las convenciones de estilo del proyecto.
- [x] Se revisó que no existan errores de linting o warnings en consola.
- [x] Se probaron los cambios localmente y funcionan como se espera.
