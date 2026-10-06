# Refresh visual del panel, acceso, escáner y pantallas complementarias

## Objetivo y alcance

Trasladar la identidad del home a `/admin/*`: Manrope, paleta azul/dorado/naranja, superficies suaves y movimiento breve. Mantener datos, contratos, API, permisos y flujos existentes. El alcance se amplió por petición posterior del dueño para renovar login, recuperación, escáner, términos y las otras pantallas pendientes: alta, confirmación, errores y panel interno. Facturación sigue condicionada por su feature flag y continúa siendo un mockup.

## Evidencia y reutilización

- `apps/frontend/src/pages/public/Home.tsx:82`: paleta y tipografía del home.
- `apps/frontend/src/components/Layout.tsx:95`: shell compartido por las rutas OWNER, menú móvil y acceso al escáner.
- `apps/frontend/src/hooks/useTheme.ts:30`: tema persistido, compartido con la web.
- `apps/frontend/src/pages/admin/card/CardEditor.tsx:74`: estado del editor conservado entre pasos.
- `apps/frontend/src/components/ui/Modal.tsx:20`: diálogo compartido con el panel interno; foco delimitado mediante `trapFocus`, desactivado por defecto fuera del admin.
- Dashboard, clientes, historial, analytics, editor, equipo y soporte tienen pruebas de comportamiento existentes; no acreditan verificación visual en navegador.

## Diseño y decisiones

- Tokens semánticos de panel con variantes claras/oscuras; Tailwind para estilos y CSS para keyframes y reglas compartidas de entrada escalonada.
- Unificar encabezados, superficies, campos, tablas, botones, estados y colores SVG.
- Layout con marca coherente con home, navegación más compacta, drawer accesible y acceso visible al escáner.
- Movimiento finito y moderado: entradas, cambios de paso y diálogos. Respetar automáticamente la preferencia del sistema, sin un botón adicional en el panel.
- Conservar estado del editor y acciones durante animaciones. No simular métricas ni resultados de operaciones.
- La base visual se reutiliza en las áreas públicas e internas incluidas en la ampliación; la identidad del comercio y los botones oficiales de Wallet se conservan.
- Los tonos del home se adaptan para contraste en textos y etiquetas. Los diálogos OWNER mantienen el foco dentro, incluyen campos y restauran el control que los abrió.

## Etapas y aceptación

1. Base visual: tokens, tipografía y preferencia de movimiento funcionan en ambos temas.
2. Layout y dashboard: marca, menú móvil, indicadores y actividad coherentes; teclado y foco operativos.
3. Clientes y analytics: búsqueda, historial, exportación, pestañas y gráficos conservan comportamiento.
4. Tarjeta y operación: editor, equipo, sucursales, soporte, configuración y billing condicional adoptan la base.
5. Validación: lint, typecheck, tests del frontend y build; navegador a 390, 768 y 1440 px, estados de carga/vacío/error, claro/oscuro y movimiento reducido.

## Verificación prevista

Desde la raíz: `pnpm --filter frontend run lint`, `pnpm --filter frontend run typecheck`, `pnpm --filter frontend run test`, `pnpm --filter frontend run build`. Compilar shared si su salida falta. Añadir pruebas de navegación/foco y movimiento cuando cambie comportamiento. Registrar por separado checks automáticos, navegador con datos de prueba y flujos con servicios reales.

## Avance

- Completado: investigación, base visual, layout, dashboard, clientes, analytics, editor y pantallas de operación; documentación y verificaciones locales.
- Se reutilizaron assets y Manrope del home, `motion/react`, tema y consultas existentes. No se añadieron dependencias ni cambios de contratos, API, permisos o datos.

## Evidencia de validación

- Frontend: lint y typecheck pasaron. Lint conserva 10 advertencias previas de hooks/exports/variables sin uso. Build de producción pasó; conserva avisos de Vite sobre `__dirname` y tamaño de chunks.
- Suite existente: 50 archivos, 286 pruebas pasaron. Después de incorporar foco y controles de movimiento se ejecutaron los consumidores afectados: 30 pruebas de layout/editor/analytics/clientes/indicadores, 23 de layout/diálogos/clientes/dashboard/soporte y 6 de equipo/QR/panel interno; todas pasaron. Los conjuntos se solapan y no se suman como pruebas distintas.
- Nuevas pruebas: `Layout.test.tsx` (4) verifica drawer, teclado, navegación, restauración de foco, preferencia del sistema y conservación de formularios. `Modal.test.tsx` (2) verifica campos en el ciclo de foco, Escape y acciones deshabilitadas.
- Navegador Chrome a 390×844, 768×1024 y 1440×1000: temas claro/oscuro, dashboard, clientes, analytics, editor, configuración, equipo, soporte, sucursales y facturación condicional. Sin desbordamiento horizontal de la página en los tamaños revisados; las tablas conservan su scroll interno.
- Comprobados carga/vacío/error del dashboard, menú móvil, foco de confirmación/formularios, reducción de animaciones y borrador del editor conservado entre pasos y al cambiar la preferencia. Los skeletons dejan de animarse al reducir movimiento.
- Captura del dashboard oscuro con datos sintéticos: `C:/Users/Crissys/.codex/tmp/admin-refresh/dashboard-dark.jpg` (evidencia local, fuera del repositorio).
- `git diff --check` pasó. El fixture y los servidores de QA fueron retirados al finalizar.

## Límites y seguimiento

La primera comprobación visual utilizó componentes reales y datos sintéticos en un fixture aislado; no acreditó consultas o escrituras contra servicios reales. En el refinamiento de movimiento se pudo revisar la sesión OWNER del entorno local. Queda pendiente la aceptación en dispositivo físico y las operaciones de escritura con servicios reales. Facturación conserva su feature flag y acciones de mockup; no se habilitaron cobros.

## Refinamiento de movimiento

- A petición del dueño, se retiró el botón «Movimiento». La preferencia de accesibilidad del dispositivo controla las animaciones automáticamente.
- Entradas de izquierda a derecha de 16 px y 420 ms, con 65 ms entre tarjetas y desfase máximo de 325 ms. Se aplican a dashboard, grupos de analytics, clientes, equipo, sucursales, configuración, soporte, planes y pasos del editor. Se retiró el fade global de navegación para evitar efectos superpuestos.
- `PanelTitle` revela letras en 300 ms con un desfase total máximo de 260 ms. Conserva cada palabra y ofrece un texto completo para lectores de pantalla. Los nombres y campos editables no se animan con cada cambio.
- Las entradas usan fill `backwards`: al terminar no dejan una transformación que altere el posicionamiento de un diálogo. No se añadieron dependencias ni se remontan formularios al cambiar preferencias.
- Verificación: 25 pruebas de layout/dashboard/analytics/clientes/editor y 15 de layout/títulos/dashboard/analytics pasaron (conjuntos solapados); lint y typecheck pasaron con las mismas 10 advertencias previas. La prueba nueva de títulos acredita el nombre accesible completo; layout comprueba cambios de preferencia del sistema sin pérdida de un borrador.
- Chrome con sesión OWNER local: dashboard, analytics y facturación; móvil a 390×844 y escritorio a 1440×1000. Se comprobaron los tiempos/desfases CSS, bloques con opacidad 1 y sin transformación al terminar, ausencia de desbordamiento horizontal y menú sin botón de movimiento. La reducción de movimiento se verificó en pruebas automatizadas y por las reglas CSS `prefers-reduced-motion`; no se cambió la preferencia del sistema operativo.
- Captura local: `C:/Users/Crissys/.codex/tmp/admin-refresh/analytics-motion.jpg`. No se levantó otro servidor; se reutilizó el entorno local del usuario y se restauró el viewport del navegador.

## Refresh de acceso y recuperación

- Completado: login y recuperación con `AuthFrame`, marca del home, ilustración de tarjeta en escritorio y formulario prioritario en móvil. Los tokens existentes se extrajeron a `components/ui/walletTheme.ts` para compartir valores con el panel.
- Fondo decorativo Canvas: 24–72 partículas según área, paleta de Wallet, deriva suave y repulsión acotada a 38 px dentro de un radio de 120 px. Dibujado limitado a unos 30 fps y resolución a 2×. Sin eventos de toque que interfieran con móvil; el Canvas no recibe foco ni bloquea clics.
- Preferencia `prefers-reduced-motion` observada con `useMediaQuery`: fondo estático y entradas desactivadas; cambiarla conserva los campos. Se cancelan frames y desconectan observadores/eventos al salir, y se pausa el bucle al ocultar la pestaña.
- Login: etiquetas asociadas, autocompletado, mostrar/ocultar contraseña, carga y errores anunciados. Se retiró el checkbox «Recordarme» que no tenía efecto. Se mantienen Auth, persistencia, guards, permisos y URL de recuperación de Supabase; la recuperación conserva el aviso neutro. La pantalla de nueva contraseña reutiliza la misma base visual y sus validaciones existentes.
- Pruebas: 39 de acceso/partículas/layout/rutas/guards pasaron; después se verificaron las 10 pruebas de autenticación y partículas, incluyendo la nueva prueba de cambio de preferencia sin pérdida del formulario. Los conjuntos se solapan.
- Navegador: Chrome con app real en el origen local separado `[::1]:5173`, sin cerrar la sesión del dueño en localhost. Login y modo recuperación, temas claro/oscuro, escritorio 1440×1000 y móvil 390×844; etiquetas, foco, mostrar contraseña y ausencia de desbordamiento horizontal. No se enviaron correos ni se cambiaron credenciales reales; esas operaciones se verificaron mediante mocks.
- Captura local: `C:/Users/Crissys/.codex/tmp/admin-refresh/login-dark.jpg`. Sin servidor adicional, fixture ni dependencias nuevas. Viewport restaurado y pestaña de QA cerrada.
- Lint, typecheck y build final pasaron; se conservan las 10 advertencias de lint y los avisos de Vite preexistentes. `git diff --check` pasó.

## Refresh del escáner y movimiento del login

- Completado por petición posterior: `/scan` comparte tokens, Manrope, marca y tema con home/panel. Encabezado adaptable con controles de 44 px, instrucciones iniciales en tres tarjetas y entradas breves. Se renovaron búsqueda manual, validación/compra, premios, carga, confirmaciones, duplicados, errores y avisos de red/sesión. El video mantiene su superficie oscura y la gestión de cámara existente.
- `IdentifierInput` incorpora una variante `wallet` utilizada por el escáner y el alta; conserva formatos, validadores, cursor y comportamiento de sus variantes previas. Los formularios y resultados permiten scroll en pantallas bajas, con acciones de validación fuera del área desplazable.
- No se modificaron servicios, contratos, permisos ni reglas de sello/canje. La nueva prueba del flujo comprueba que cambiar el tema conserva monto/nota, sin enviar operaciones ni regresar a cámara. Se mantienen las pruebas de validación previa, premios y ciclo de cámara.
- Login: textos y tarjeta de la izquierda entran desde 16 px a la izquierda en 420 ms, con desfases de 0/80/160/240 ms. La deriva autónoma del fondo aumenta a órbitas acotadas de 24×18 px, con ciclos aproximados de 16 y 20 s. Conserva repulsión, pausa de pestaña y preferencia de movimiento reducido. Las pruebas acreditan movimiento sin mouse tanto en el cálculo como en el bucle de dibujado.
- Validación automática: lint, typecheck, build y 64 pruebas en 11 archivos de escáner, acceso, partículas e identificación pasaron. Se conservan las 10 advertencias previas de lint y los avisos conocidos de Vite. `git diff --check` pasó.
- Chrome: escáner real en sesión OWNER local, inicio y búsqueda manual, temas claro/oscuro, validación de campo vacío y foco; escritorio 1440×1000 y móvil 390×844/390×560. Login real en origen local separado: entradas escalonadas, fondo activo y vista móvil sin desbordamiento horizontal.
- Validación/compra, selección de premios, confirmación, error y duplicado se revisaron con los componentes reales y datos sintéticos en un fixture temporal, sin operaciones de API. Se comprobó scroll hasta las acciones en pantallas bajas. El fixture y las pestañas de revisión se retiraron; viewport y tema originales restaurados. No se levantaron servidores adicionales ni se detuvo el entorno del usuario.
- Captura local: `C:/Users/Crissys/.codex/tmp/admin-refresh/scanner-dark.jpg`. Quedan pendientes cámara/QR en dispositivo físico y sello/canje con servicios reales; los mocks y el fixture no acreditan esas integraciones.

## Cierre de pantallas pendientes y preparación del PR

- `/terminos` reutiliza `PublicFrame` con marca, Manrope, ambos temas, halo discreto e índice de 12 enlaces a secciones, fijo en escritorio. La lectura queda limitada a una columna y cada sección tiene su propia superficie. El contenido legal se comparó con `origin/dev` y sigue idéntico; no se cambió `TERMS_VERSION`, la aceptación ni el aviso de borrador.
- La revisión del inventario de rutas encontró pendiente el alta, confirmación, local no encontrado, 404, carga y acceso denegado, además de la identidad del panel interno. Esas vistas ahora comparten la base de Wallet. El alta mantiene la marca del comercio, reglas y campos; los botones oficiales de Apple/Google Wallet siguen iguales.
- El panel interno usa tokens comunes en navegación, indicadores, gráficos, tablas, formularios, tickets e historial; el selector de tema y la salida están disponibles también en móvil mediante su navegación horizontal. No cambian endpoints, permisos, exposición de datos ni auditoría.
- Validación completa local: `pnpm -r run lint`, `pnpm -r run typecheck`, `pnpm -r run test` y `pnpm -r run build` pasaron. Pruebas: shared 31, backend 506, frontend 307 (844 en total). La auditoría de producción pasó con la misma excepción declarada en CI. Se mantienen advertencias previas de lint y de Vite; no se debilitaron checks.
- Pruebas de BD: 36 en 3 archivos pasaron contra Supabase local, con fixtures revertidos mediante rollback. Esta ejecución valida la BD existente; la CI comprueba además las migraciones desde cero.
- Chrome: términos a 1440×1000 y 390×844, ambos temas, enlaces del índice y ausencia de desbordamiento. Alta real `/join/cafe-demo`, móvil y ambos temas: el nombre se conserva al cambiar tema; no se aceptaron términos ni se emitió un pase. 404 público revisado en móvil.
- Panel interno real con cuenta seed en un origen local separado: resumen, marcas y tickets, ambos temas y tamaños móvil/escritorio; lectura contra servicios locales sin escrituras de negocio. La tabla y navegación conservan scroll propio en móvil. Se cerró la sesión de prueba, se restauraron tema/viewport y se retiraron las pestañas de QA, sin levantar servidores adicionales ni detener el entorno del usuario.
- Evidencia local fuera del repositorio: `C:/Users/Crissys/.codex/tmp/admin-refresh/terms-dark.jpg` y `internal-dark.jpg`. Permanecen los límites de dispositivo físico, cámara y emisión/canje real de Wallet documentados arriba.
- Tras los ajustes finales de contraste y controles internos: lint, typecheck, build del frontend y 40 pruebas de sus consumidores pasaron. `git diff --cached --check` pasó. Revisión local con la skill `pr-review`, sin hallazgos bloqueantes pendientes.
