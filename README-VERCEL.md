# Guía de Despliegue en Vercel para Punto Tecnowork

Esta guía te ayudará a publicar tu aplicación en **Vercel** de manera gratuita, manteniéndola conectada a tu base de datos de **Supabase**, y configurando **Google Auth** para que tanto tu entorno local (`localhost:3000`) como tu entorno de producción (`tu-app.vercel.app`) funcionen al mismo tiempo sin conflictos.

---

## 🚀 Paso 1: Desplegar el código en Vercel

Vercel es la plataforma ideal para hospedar aplicaciones hechas con Next.js (como esta).

1. Ingresa a [Vercel](https://vercel.com) e inicia sesión (preferiblemente con tu cuenta de GitHub).
2. Haz clic en el botón **"Add New..."** (Añadir nuevo) y selecciona **"Project"** (Proyecto).
3. Vercel te mostrará una lista de tus repositorios de GitHub. Localiza `powerpuntotw/PuntoTecnowork2` y haz clic en **"Import"**.
4. En la pantalla emergente que aparece ("Configure Project"):
   - El **Framework Preset** debe decir automáticamente "Next.js".
   - Abre la pestaña **"Environment Variables"** (Variables de Entorno).
5. Debes copiar y pegar los mismos valores secretos que tienes en tu archivo `.env.local` en tu PC (este archivo nunca se sube a internet por seguridad). Agrega:
   - Nombre: `NEXT_PUBLIC_SUPABASE_URL` | Valor: *(Tu URL de Supabase)*
   - Nombre: `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Valor: *(Tu Anon Key de Supabase)*
   - Nombre: `NEXT_PUBLIC_APP_URL` | Valor: *(Déjalo en blanco por ahora, Vercel lo asignará)*
6. Haz clic en **"Deploy"**.
7. ¡Espera unos minutos! Vercel instalará las dependencias y construirá tu aplicación web. Cuando termine, te dará una URL (por ejemplo, `https://punto-tecnowork2.vercel.app`). **Copia esta URL exacta.**

---

## 🔒 Paso 2: Configurar Supabase para que acepte Vercel

Supabase es estricto con la seguridad y por defecto solo permite que ciertas páginas web intenten iniciar sesión. 

1. Ingresa a tu panel de **Supabase**.
2. Ve al menú lateral izquierdo y haz clic en **Authentication** (Ícono de candados o personas).
3. En el menú secundario de Auth, ve a **URL Configuration**.
4. En la sección **Site URL**:
   - Pega la URL oficial de Vercel que copiaste en el paso anterior. (Ej. `https://punto-tecnowork2.vercel.app`)
5. En la sección **Redirect URLs** (justo debajo), añade las siguientes 4 líneas exactas. Estas reglas le dicen a Supabase que el login puede venir de la nube O de tu computadora:
   - `http://localhost:3000/**`
   - `http://localhost:3000/auth/callback`
   - `https://punto-tecnowork2.vercel.app/**` (Sustituye por tu URL real de Vercel)
   - `https://punto-tecnowork2.vercel.app/auth/callback` (Sustituye por tu URL real de Vercel)
6. Guarda los cambios.

---

## 🔑 Paso 3: Configurar el Login de Google (Google Cloud Console)

Como los usuarios inician sesión con Google, debes decirle a los servidores de Google que `Vercel` es una aplicación de confianza.

1. Ingresa a **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com/)).
2. Selecciona el proyecto que creaste para esta app.
3. Ve a **APIs & Services** (API y Servicios) -> **Credentials** (Credenciales).
4. Busca tu credencial actual bajo la categoría "Identificadores de cliente OAuth 2.0" y haz clic en el ícono del lápiz para editarla.
5. En **Orígenes de JavaScript autorizados** (Authorized JavaScript origins), haz clic en "Añadir URI" y pega la URL de Vercel (Ej. `https://punto-tecnowork2.vercel.app`).
6. En **URI de redireccionamiento autorizados** (Authorized redirect URIs), no tienes que hacer nada nuevo porque Supabase intercepta el login de google y luego decide a dónde enviarte de vuelta basándose en lo que configuramos en el Paso 2. (Deberías tener aquí solamente la URL larguísima que te dio Supabase, ej: `https://[ID_DE_PROYECTO].supabase.co/auth/v1/callback`).
7. Haz clic en **Guardar**.

---

## 🎉 ¡Listo! Entornos Paralelos

¡Eso es todo! Ahora tienes el paraíso de los programadores:
- Cuando ejecutes `npm run dev` en tu Visual Studio Code, los cambios y las pruebas las harás en `http://localhost:3000`. Al iniciar sesión, Supabase detectará tu computadora y te devolverá al Localhost.
- Cuando vayas a tu dominio de `https://punto-tecnowork2.vercel.app`, estarás viendo la versión estable para tus clientes y empleados. Al iniciar sesión, Supabase detectará la nube y devolverá a tus usuarios a Vercel.

**Ambos entornos continuarán guardando y leyendo datos de la misma base de datos de Supabase.** 

*Nota: Para que un cambio que programaste en tu PC (localhost) aparezca en el dominio de Vercel, sólo tienes que guardar tus archivos y ejecutar `git push` desde tu terminal en VSCode. Vercel detectará el nuevo código en GitHub automáticamente, y desplegará los cambios al público en segundos.*
