# 🎟️ Wallet Fidelity

**Wallet Fidelity** es una plataforma SaaS B2B2C diseñada para revolucionar los programas de lealtad en locales comerciales. Aprovechando el ecosistema nativo de Apple Wallet y Google Wallet, eliminamos por completo la fricción de uso tradicional: los clientes no necesitan instalar aplicaciones de terceros. Todo el ciclo, desde la adquisición hasta la recompensa, ocurre en la billetera nativa que ya tienen en sus teléfonos.

---

## 👥 Actores y Roles en la Plataforma

El sistema está diseñado para interactuar con tres tipos de usuarios clave, cada uno con herramientas y flujos específicos:

### 1. El Cliente (Usuario Final)
*   **Fricción Cero:** El cliente escanea un QR en la mesa (Sin apps)[cite: 1]. No hay descargas desde la App Store o Google Play.
*   **Emisión Nativa:** Tras el escaneo, la plataforma procesa la solicitud y entrega Tarjeta Digital directamente a su celular[cite: 1].
*   **Interacción en Local:** Durante la retención (el día a día), el cliente compra algo y muestra su pantalla al personal[cite: 1].
*   **Recompensas Pasivas:** Sin tener que abrir ninguna app, el celular le notifica su progreso. El sistema avisa: "¡Ganaste un sello!" o, cuando corresponde, avisa: "¡Premio desbloqueado!"[cite: 1].

### 2. El Cajero (Operativa del Local)
*   **Velocidad de Operación:** Utiliza un dispositivo del local (móvil o tablet) como escáner a través de una Progressive Web App (PWA).
*   **Validación:** El cajero simplemente escanea la tarjeta (1 segundo) mostrada por el cliente para registrar la visita[cite: 1].
*   **Cero Capacitación Compleja:** Interfaz minimalista (Escanear -> Confirmar Sello -> Listo).

### 3. El Dueño del Negocio (Administrador)
*   **Gestión de Campañas:** Define las reglas de fidelización (ej. "Compra 5 cafés, lleva 1 gratis").
*   **Inteligencia de Negocio:** La plataforma procesa las interacciones, genera base de datos y métricas, y finalmente entrega valor al negocio[cite: 1]. Permite visualizar tasas de retorno, clientes más frecuentes y horas pico de canje de recompensas.

---

## 🏗️ Capas de Servicios (Arquitectura)

La infraestructura de Wallet Fidelity sigue un modelo de microservicios y Serverless, dividida en 5 capas lógicas:

1.  **Capa de Dispositivos (Interacción Física)**
    *   **Dispositivo del Cliente:** Teléfonos iOS/Android que almacenan los pases criptográficos (`.pkpass` o JWT de Google).
    *   **Dispositivo del Local:** Hardware de punto de venta, tablet o smartphone del cajero.
2.  **Capa Frontend (Presentación)**
    *   **Web Pública / Landing de Emisión:** Sitio ultraligero que captura el RUT/Teléfono y emite el pase.
    *   **PWA del Cajero & Portal Admin:** Aplicación Next.js (React) instalable, con acceso a la cámara del dispositivo para decodificar códigos QR/Barras y visualizar dashboards.
3.  **Capa de Backend (Lógica y Reglas de Negocio)**
    *   **API REST:** Construida en Node.js, valida la sesión de los cajeros, procesa las transacciones de sellos y ejecuta las reglas de las recompensas. Esta capa es la encargada de la acción donde añade un Sello/Punto a la cuenta del usuario[cite: 1].
    *   **Motor de Pases (PassKit Generator):** Módulo encargado de firmar criptográficamente los pases con los certificados de Apple y estructurar los objetos de Google Wallet.
4.  **Capa de Datos y Autenticación (BaaS)**
    *   **Supabase (PostgreSQL):** Almacenamiento relacional que maneja la persistencia de usuarios, locales, transacciones y programas de lealtad.
    *   **Auth Module:** Gestión de identidades con Row Level Security (RLS) para aislar la data de cada comercio.
5.  **Capa Wallet (Ecosistema Externo)**
    *   **Apple Push Notification service (APNs) & Google API:** Infraestructura externa responsable de actualizar visualmente las tarjetas en los dispositivos y disparar las notificaciones push en tiempo real.

---

## 🔄 Flujo Operativo (El Ciclo de Vida)

La plataforma opera en tres fases secuenciales continuas:

*   **FASE 1: Adquisición:** 
    1. El cliente escanea QR en la mesa (Sin apps)[cite: 1].
    2. La plataforma entrega Tarjeta Digital que se guarda en la Wallet nativa[cite: 1].
*   **FASE 2: Retención (El día a día):** 
    1. El cliente compra algo y muestra su pantalla[cite: 1].
    2. El personal del local escanea la tarjeta (1 segundo)[cite: 1].
    3. La plataforma valida y añade un Sello/Punto al pase[cite: 1].
*   **FASE 3: Recompensa y Fidelización:** 
    1. El sistema actualiza la tarjeta y envía una notificación push que avisa: "¡Ganaste un sello!"[cite: 1].
    2. Si se cumple la meta, el dispositivo avisa: "¡Premio desbloqueado!"[cite: 1].
    3. De forma asíncrona, el sistema genera métricas y base de datos para el dueño del local[cite: 1].

---

## 🚀 Guía de Inicio Rápido (Local Development)

*(Instrucciones en construcción para los desarrolladores)*

### Pre-requisitos
- Node.js v18+
- pnpm
- Cuenta en Supabase
- Certificados de Apple Developer (`.p12` y contraseñas)
- Google Cloud Service Account JSON

### Configuración de Entorno
1. Clonar el repositorio: `git clone https://github.com/tu-org/wallet-fidelity.git`
2. Instalar dependencias: `pnpm install`
3. Copiar archivo de variables de entorno: `cp .env.example .env`
4. Iniciar entorno de desarrollo: `pnpm run dev`

---

*Diseñado para ayudar a los comercios a recuperar clientes, un sello a la vez.*
