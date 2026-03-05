# Guía Maestra: Punto Tecnowork v3 (Next.js + Firebase)

Este documento detalla la arquitectura, los requisitos y la estrategia paso a paso para reconstruir el proyecto **Punto Tecnowork** desde cero utilizando el ecosistema de **Google Firebase**, con el objetivo de lograr una estabilidad absoluta y evitar los problemas de carreras, deadlocks y SSR que sufrimos con Supabase.

---

## 🏗️ 1. Arquitectura del Nuevo Proyecto

**Stack Tecnológico:**
*   **Framework:** Next.js 14+ (App Router)
*   **Lenguaje:** JavaScript / TypeScript (Recomendado para evitar bugs de tipos en el nuevo State)
*   **Estilos:** Tailwind CSS
*   **Autenticación:** Firebase Authentication (Maneja login con Google y persistencia de sesión sin bloqueos de `navigator.locks`).
*   **Base de Datos:** Cloud Firestore (NoSQL, en tiempo real, extremadamente rápido para aplicaciones web, ideal para el sistema de soporte/chat).
*   **Almacenamiento:** Firebase Cloud Storage (Para imágenes de perfiles, comprobantes de pago y recompensas).
*   **Hosting:** Vercel o Firebase Hosting.

---

## 🚫 2. Evitando los Problemas Conocidos (Lecciones Aprendidas)

Al mudarnos de Supabase a Firebase, debemos estructurar los cimientos para **no repetir** los errores del pasado:

### A. El "Deadlock" y Spinner Infinito de Autenticación
*   **Por qué pasaba:** Supabase usa `navigator.locks` de la web API para sincronizar pestañas, lo cual falla estrepitosamente con el *React StrictMode*.
*   **Solución Firebase:** Firebase Auth maneja su persistencia internamente (`indexedDB` by default). El contexto de autenticación en Firebase se hace escuchando *exclusivamente* `onAuthStateChanged`. Es naturalmente sincrónico en cuanto se resuelve la primera vez y no sufre de interbloqueos de pestañas.

### B. Protecciones Server-Side (Middleware)
*   **Desafío Firebase:** A diferencia de Supabase, que tiene `@supabase/ssr` muy integrado, Firebase Auth por defecto es Client-Side. Para proteger las rutas con Middleware de Next.js (`middleware.js`), tenemos que usar **Session Cookies de Firebase**.
*   **Solución Firebase:** Cuando el usuario se loguea en el cliente, se dispara un endpoint de nuestra API (Route Handler en Next.js) que toma el token de Firebase (ID Token) y le pide a `firebase-admin` que genere una Cookie de Sesión de larga duración (ej. 5 días). El Middleware leerá *esa cookie* de forma ultra-rápida y sin cuelgues.

### C. El `RoleGuard` y Redirecciones Prematuras
*   **Solución Firebase:** Replicaremos la lógica HÍBRIDA estabilizada. 
    1. Firebase Auth confirma que hay usuario.
    2. React se queda en "Cargando..." *hasta* que Firestore devuelva el documento del perfil (el equivalente a la tabla `profiles`).
    3. Si el usuario existe pero el perfil aún dice `null`, la app **Paciéntemente Espera**. No lanza un redirect impulsivo a `/login`.

---

## 🗄️ 3. Nuevo Diseño de Base de Datos (Firestore NoSQL)

Firestore no funciona con tablas relacionales (SQL). Funciona con Colecciones y Documentos.

**Estructura de Colecciones Principales:**

1.  📁 **`users`** (Reemplaza a `profiles`)
    *   `uid` (String, provisto por Firebase Auth)
    *   `email` (String)
    *   `full_name` (String)
    *   `user_type` (String: "client", "local", "admin")
    *   `active` (Boolean)
    *   `avatar_url` (String)
    *   `points_account_id` (String - Referencia opcional cruzada)
    *   *Subcolecciones sugeridas:* Ninguna por ahora, mantener plano.

2.  📁 **`points_accounts`**
    *   `account_id` (Auto-generado)
    *   `client_id` (Referencia al `uid` del cliente)
    *   `total_points` (Number)

3.  📁 **`transactions`** (Reemplaza a `points_transactions`)
    *   `transaction_id` (Auto-generado)
    *   `account_id` (Referencia a `points_accounts`)
    *   `points` (Number, positivo o negativo)
    *   `type` (String: "earned", "redeemed", "adjustment")
    *   `description` (String)
    *   `admin_id` (El `uid` del rol que aprobó)
    *   `created_at` (Firebase Timestamp)

4.  📁 **`rewards`** (Catálogo de premios)
    *   Sigue un formato similar al actual.

5.  📁 **`tickets`** (Sistema de Soporte)
    *   `ticket_id` (Auto-generado)
    *   `client_id` (El que inició el chat)
    *   `destination_type` (String: "admin", "local")
    *   `destination_id` (String u ObjectId, null si es general para todos los admins)
    *   `subject` (String)
    *   `category` (String)
    *   `status` (String: "open", "closed")
    *   `created_at`, `updated_at` (Firebase Timestamp)
    *   📁 *Subcolección anidada:* **`messages`**
        *   `sender_id` (`uid`)
        *   `content` (String)
        *   `created_at` (Firebase Timestamp)

---

## 🛠️ 4. Pasos Etapa por Etapa para la Reconstrucción

### Fase 1: Configuración en Consola (Google Cloud / Firebase)
1.  Ir a [Firebase Console](https://console.firebase.google.com/).
2.  Crear **Nuevo Proyecto**: `punto-tecnwork-v3`. (Nueva cuenta limpia de Google).
3.  Habilitar **Authentication**: Activar el proveedor de Google (Configurar pantalla de consentimiento OAuth interna o externa).
4.  Habilitar **Firestore Database** (Elegir un servidor cerca de ti, ej. `southamerica-east1` o `us-east4` y arrancar en "Modo Producción").
5.  Habilitar **Firebase Storage**.
6.  Registrar una nueva Web App en Firebase para obtener el objeto `firebaseConfig`.

### Fase 2: Configuración del Proyecto Local (Next.js)
1.  Hacer un branch nuevo limpo o clonar un nuevo `create-next-app@latest`.
2.  Instalar dependencias clave:
    ```bash
    npm install firebase firebase-admin next-firebase-auth-edge
    ```
    *(Nota: `next-firebase-auth-edge` es una librería moderna brutal para manejar las Cookies de sesión en el Middleware de Next.js App Router sin dolores de cabeza).*

### Fase 3: Núcleo de Autenticación (El Nuevo AuthContext Seguro)
1.  Configurar variables de entorno `.env.local` con las claves públicas y privadas de Firebase Admin.
2.  Crear el `lib/firebase/client.js` inicializando el app solo una vez:
    ```javascript
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { getAuth } from "firebase/auth";
    const firebaseConfig = { /* ... */ };
    export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    export const auth = getAuth(app);
    ```
3.  Armar el `AuthContext.js` escuchando puramente `onIdTokenChanged(auth, callback)`. Esto manejará los cambios de estado de forma reactiva, sincronizándo el `token` con nuestro sistema de Cookies vía `fetch('/api/login')` para nutrir al Middleware.

### Fase 4: Migración de Modelos a Firestore
1.  Crear scripts de limpieza en tu máquina para extraer los datos de Supabase PostgreSQL a archivos `.json`.
2.  Crear un script en Node.js (usando Firebase Admin SDK) para inyectar inteligentemente esos datos `.json` construyendo los documentos `users`, y luego recorriendo los usuarios para emparejarles sus transacciones en las nuevas colecciones de Firestore.

### Fase 5: Vistas y Reglas de Seguridad
1.  Implementar los Layouts usando exactamente el mismo `RoleGuard.js` con paciencia que diseñamos hoy.
2.  Dado que usaremos la Admin SDK en los Server Actions (Next.js `actions.js`), no dependemos de las restrictivas (y a veces odiosas) Reglas (RLS) del cliente de Firebase, manteniendo la lógica segura en el backend de Node.js de Vercel.

---

## 📱 5. Diseño 100% Mobile-First (Compatibilidad Celular)

Dado que los usuarios locales y clientes interactúan principalmente desde sus teléfonos (escaneando códigos de barras, comprobando puntos en mostrador), toda la iteración V3 debe ser diseñada bajo el paradigma **Mobile-First**.

### Requisitos Celulares Clave:
*   **Bottom Navigation (Menú Inferior):** Para `Cliente` y `Local`, la barra lateral de escritorio se convierte en una barra de navegación inferior anclada a la pantalla para fácil acceso con el pulgar.
*   **Scanner Nativo Optimizado:** Uso de librerías modernas de lectura de QR/Barcodes (como `html5-qrcode` o integraciones nativas) comprobadas exhaustivamente en iOS Safari y Android Chrome.
*   **Gestos Táctiles (Swipe):** Implementar *swipe-to-close* en modales y *swipe-to-delete* en listas cuando aplique.
*   **Inputs y Teclado:** Evitar acercamientos automáticos molestos en iOS (asegurar `font-size: 16px` mínimo en inputs). Uso de `inputMode="numeric"` estricto para DNIs y cantidades.
*   **Carga de Imágenes (Storage):** Compresión estricta en el cliente (Browser-side image compression) antes de subir al Firebase Storage, para no consumir el plan de datos de los clientes desde sus celulares en la calle.

---

## 👥 6. Especificación de Roles y Dashboards

### A. Cliente (Usuario Final)
**Objetivo:** Acumular puntos y canjear premios.
*   **Dashboard Inicio:** Vista rápida de su saldo actual en puntos (gigante y claro), progreso hacia el próximo "tier" o nivel, y últimas 3 transacciones.
*   **Ver/Editar Perfil:** Actualizar datos personales, teléfono, avatar.
*   **Mis Puntos / Historial:** Lista cronológica detallada de puntos ganados y gastados, fecha, local donde ocurrió y descripción de la acción.
*   **Recompensas (Catálogo):** Vista de productos canjeables. Botón de "Canjear" que genera una intención de canje o QR para mostrar en el comercio.
*   **Subir Comprobantes:** Pantalla clave donde sube una foto de su recibo para que un Administrador/Local la apruebe y le otorgue puntos manuales.
*   **Soporte (Chat):** Comunicación directa estilo chat de WhatsApp donde el cliente reporta incidencias o demoras en acreditaciones. Filtro de destino (escribir a Admin o a Local específico).

### B. Sucursal / Local (Comerciantes)
**Objetivo:** Operar el ecosistema de lealtad día a día sin fricción técnica.
*   **Dashboard Inicio:** Estadísticas rápidas del día: Puntos entregados, comprobantes pendientes de este local, nuevos clientes escaneados hoy.
*   **Catálogo de Precios (Visor):** Tabla digital para tener a mano tarifas, o escanear productos.
*   **Aprobar Órdenes / Cargas:** Ver el pool de comprobantes subidos por los clientes de "esta sucursal", validarlos (aprobar/rechazar) y sumar puntos.
*   **Escanear Canjes (Redemptions):** Actuar como caja registradora de premios. Leer el código del cliente que quiere llevarse una mochila, descontar 1500 puntos y asentar el retiro del inventario de premios del local.
*   **Gestión de Clientes Express:** Buscar un cliente rápido por DNI para sumarle puntos en mostrador sin que el cliente use el celular.
*   **Soporte Técnico:** Chat dedicado para hablar con los Administradores de Punto Tecnowork frente a fallas del sistema o dudas de los cajeros.

### C. Administrador (Dueño / Control Total)
**Objetivo:** Supervisar la economía completa de puntos, auditar, facturar y administrar sedes.
*   **Dashboard "Dios" (God-mode):** Consolidado de puntos totales emitidos vs redimidos (Responsabilidad Financiera), KPIs (Top clientes, Top locales activos).
*   **Usuarios / Perfiles:** CRUD completo (Crear, Leer, Modificar, Eliminar) de CUALQUIER tipo de usuario. Activar y suspender cuentas fraudulentas.
*   **Gestión de Locales (Sedes):** ABM de sucursales físicas para poder asociar clientes y transacciones.
*   **Auditoría & Transacciones:** Vista contable intocable de cada punto movido. Capacidad de revertir transacciones sospechosas.
*   **Gestión de Recompensas:** Crear, pausar, editar premios, cambiar sus valores en puntos según inflación.
*   **Ticket Master (Soporte Central):** Inbox unificado para recibir absolutamente todos los tickets del sistema (filtrables por procedencia: cliente o local) y gestionar resoluciones en hilos de chat.
*   **Branding (Marcas Blancas):** Cambiar logotipos, términos y condiciones globalmente.

---

## 🚀 7. Checklist de Despliegue en Vercel
1. Variables `.env` productivas inyectadas en Vercel.
2. Dominio productivo verificado en Google Cloud OAuth Consent Screen.
3. Firebase Storage CORS policies configuradas para permitir subidas desde tu dominio web.
4. Reglas de Firestore en candado absoluto (vía `firebase-admin`).

## Conclusión

El uso de **Firebase** eliminará el 100% de los race-conditions provenientes del parseo de URLs de Supabase, porque Firebase usa Popups nativos o Redirects internos altamente pulidos por Google. El uso combinado de **Client SDK (para UI) + Admin SDK (Server Actions y Middleware con Cookies)** es la arquitectura definitiva líder actualmente para Next.js 14+.
