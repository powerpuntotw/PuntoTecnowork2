# 🚀 Punto Tecnowork

**Punto Tecnowork** es una plataforma integral de gestión de impresiones y fidelización de clientes. Permite a los usuarios subir archivos para imprimir, acumular puntos por sus compras y canjearlos por premios, mientras que los locales y administradores gestionan el flujo de trabajo de manera eficiente.

---

## 👥 Roles y Funcionalidades

### 📱 Portal del Cliente
Diseñado para una experiencia móvil fluida y rápida.
- **Panel de Control Personalizado**: Visualización de puntos, nivel de cuenta y órdenes recientes.
- **Sistema de Tiers (Niveles)**: Progresión de niveles (Bronce, Plata, Oro, Diamante) basada en puntos acumulados.
- **Subida de Archivos**: Carga de documentos y fotos directamente desde el dispositivo para impresión.
- **Catálogo de Premios**: Visualización y canje de puntos por productos o servicios.
- **Historial de Órdenes**: Seguimiento en tiempo real del estado de sus pedidos (Pendiente, En Proceso, Listo, Entregado).
- **Red de Locales**: Mapa o lista de locales disponibles con estado de apertura en tiempo real.
- **Soporte**: Canal de comunicación directo para consultas.

### 🏪 Gestión del Local (Punto de Impresión)
Herramientas para la operación diaria de cada sucursal.
- **Gestión de Órdenes**: Recepción y actualización de estados de impresión en tiempo real.
- **Control de Disponibilidad**: Opción de marcar el local como Abierto/Cerrado o Pausado.
- **Estadísticas Diarias**: Visualización de ingresos, órdenes completadas y puntos otorgados en el día.
- **Gestión de Clientes**: Registro de redenciones y visualización de clientes recurrentes.
- **Lista de Precios**: Gestión y consulta de precios de servicios de impresión.
- **Notificaciones**: Alertas visuales para órdenes que requieren atención inmediata.

### ⚙️ Panel de Administración
Control total del ecosistema Punto Tecnowork.
- **Gestión de Usuarios**: Administración de roles (Admin, Local, Cliente) y perfiles.
- **Configuración de Locales**: Alta, baja y modificación de puntos de impresión.
- **Control de Premios**: Gestión del catálogo de recompensas y stocks.
- **Reportes Avanzados**: Estadísticas de rendimiento por local, volumen de impresiones y métricas de fidelización.
- **Branding Personalizado**: Gestión dinámica de logos y colores de la aplicación desde el panel.
- **Auditoría**: Logs de actividad para seguimiento de acciones críticas.
- **Mantenimiento**: Herramientas de configuración técnica del sistema.

---

## 🏆 Sistema de Fidelización
El corazón de la aplicación es su sistema de puntos:
- **Acumulación**: Los clientes ganan puntos por cada compra/impresión realizada.
- **Niveles de Usuario**:
  - **Bronce**: Nivel inicial.
  - **Plata**: Beneficios adicionales.
  - **Oro**: Acceso a premios exclusivos.
  - **Diamante**: Máximo nivel con mejores tasas de conversión.
- **Canje Directo**: Integración con el catálogo de premios para redención instantánea en el local.

---

## 🛠️ Stack Tecnológico
- **Frontend**: Next.js 14+ (App Router).
- **SSR & Autenticación**: `@supabase/ssr` para gestión de sesiones en el servidor.
- **Estilos**: Tailwind CSS + Framer Motion (para animaciones premium).
- **Iconografía**: Lucide React.
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime).
- **Gráficos**: Recharts.

> [!NOTE]
> Esta aplicación fue migration de Vite a Next.js para mejorar la estabilidad de las sesiones y la eficiencia en el uso de memoria de dispositivos móviles.

---

## 🚀 Instalación y Configuración

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd puntotwag
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env.local` con tus credenciales de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://mqrgapecybuavilimgwo.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xcmdhcGVjeWJ1YXZpbGltZ3dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NzM0ODIsImV4cCI6MjA4NzI0OTQ4Mn0.0FTljdu_nwMKJrsyfMCCduE7RUrCERo8b09DBGywUnk
   ```

4. **Iniciar en modo desarrollo**:
   ```bash
   npm run dev
   ```

---

## 📄 Licencia
Este proyecto es privado y pertenece a Punto Tecnowork.
