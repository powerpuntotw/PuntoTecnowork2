# Análisis de Mecanismos de Sesión y Autenticación con Supabase

Este documento analiza cómo se gestionaron dos problemas críticos de reactividad y estado en una Single Page Application (SPA) usando React/Vite, y cómo esta misma lógica se implementaría en una arquitectura de Next.js (App Router).

---

## 1. Problema de la Recarga (F5) y Carga Infinita

Al presionar F5 en la aplicación, el estado de React se reinicia por completo. El navegador debe consultar asíncronamente a Supabase para verificar si la sesión sigue activa localmente y, posteriormente, descargar los datos del perfil de usuario. Si la red se ralentiza o hay un fallo silencioso durante esta etapa de "arranque", la pantalla se quedaba "colgada" infinitamente en estado de carga.

### La Solución en Vite + React: "El Cinturón de Seguridad"

En el `src/contexts/SessionContext.tsx` se implementa un temporizador máximo (timeout) de 5 segundos. Esta red de seguridad actúa forzando a la aplicación a abandonar la pantalla de carga sin importar el motivo del retraso:

**Código Clave: El Timeout de Emergencia**
```typescript
// En SessionContext.tsx (dentro de initializeSession)

// Safety timeout to prevent eternal loading if init gets stuck
initTimeout = setTimeout(() => {
  if (mounted.current && loading) {
    console.warn('SessionContext - Safety timeout triggered, forcing load to finish');
    setLoading(false); // <--- Forzamos el fin de la carga, desbloqueando el render de la App
  }
}, 5000); // Límite de 5 segundos
```

---

## 2. Problema de Pestaña Inactiva Corta (Pantalla en Blanco tras 2 minutos)

**El Síntoma Original:**
Si dejabas la pestaña de la aplicación abierta sin interactuar por un periodo muy corto (alrededor de 2 minutos máximo), al intentar hacer clic en alguna función, la aplicación "crasheaba" quedándose en blanco de repente. La única forma de lograr que la aplicación y la conexión con Supabase volviera a leer los datos sin problemas era mediante un *F5 manual*.

**La Causa Raíz:**
Los navegadores modernos detienen o "duermen" la ejecución de JavaScript en pestañas inactivas para optimizar memoria y CPU. Cuando volvías a la aplicación pasados esos 2 minutos y realizabas una acción (despertando la pestaña), el SDK en segundo plano de **Supabase disparaba abruptamente los eventos acumulados** o eventos de cambio de foco en su `onAuthStateChange`. Esto resultaba en múltiples disparos repetitivos del estado `SIGNED_IN` o refrescos confusos. En consecuencia, el Contexto de React se sobrescribía, lanzaba *race conditions* (condiciones de carrera) entre promesas intentando re-pedir el perfil, o dejaba las variables `user` o `profile` nulas momentáneamente; y como no tenían protección, React fallaba y rompía la UI dejándola blanca.

### La Solución en Vite + React: "Bloqueo y Deduplicación Inteligente"

El mecanismo principal que logra prevenir esa pantalla en blanco y ese comportamiento errático consiste en un poderoso filtro en el *Listener* de Supabase. Este filtro ignora todo evento de autenticación que reciba tras la inactividad *si resulta que el usuario activo es el mismo que ya teníamos registrado*.

**Código Clave: La Deduplicación en el Listener (`SessionContext.tsx`)**
```typescript
// Suscripción constante a lo que pasa con la sesión (despertar de pestaña, expiraciones, etc.)
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, currentSession) => {
    
    // MECANISMO 1: Evitar procesar ráfagas del MISMO evento re-disparado al despertar la pestaña
    const eventKey = `${event}-${currentSession?.user?.id || 'none'}`;
    if (lastProcessedEvent.current === eventKey) {
      return; // <-- Si es el evento que acaba de ocurrir, no hacemos NADA
    }
    lastProcessedEvent.current = eventKey;

    // MECANISMO 2: El candado contra re-inicializaciones por inactividad
    // Si despertamos la pestaña tras 2 minutos y Supabase dice "SIGNED_IN",
    // pero el usuario actual en el estado (sessionIdRef.current) sigue siendo exactamente la misma persona...
    if (event === 'SIGNED_IN' && currentSession) {
      if (isInitialized.current && sessionIdRef.current === currentSession.user.id) {
        return; // <--- ESENCIAL PARA EVITAR LA PANTALLA BLANCA
        // Se aborta aquí. De esta forma no se destruye el estado actual ni se re-pide a la BDD,
        // lo que nos permite dar clic y "seguir trabajando" tal cual como lo dejamos.
      }
      
      // ... (Resto del código para carga en segundo plano si de verdad fuera un login nuevo)
    }
  }
);
```

Gracias a estas líneas, al pasar esos 2 minutos de inactividad, si cliqueas después, el evento fantasma que lanza Supabase es simplemente descartado de inmediato, y tus funciones leen la base de datos sin problemas continuos.

Adicionalmente, si el click hiciera fallar completamente un componente porque la sesión se perdiera 100%, entra en juego el `AuthGuard` explicativo:

```typescript
// En AuthGuard.tsx
if (!session || !user) {
  // En caso que el estado de sesión caiga, nunca dejará la página blanca, sino que obligará a re-iniciar sesión.
  showError('Necesitas iniciar sesión para acceder a esta página.');
  setRedirectPath('/login');
  return;
}
```

---

## 3. Implementación en Next.js (App Router)

### Diferencia Arquitectónica Fundamental
Si decidiéramos portar esta misma "resistencia" a fallos a **Next.js**, la filosofía de solución cambiaría porque en lugar de estar haciendo esta ardua defensa en la memoria del navegador del usuario (que puede dormirse por inactividad), lo resolveríamos en el **Servidor (SSR)** con Middlewares.

### Solucionar el equivalente de "Inactividad y Refresco en Next.js"
En Next.js (`@supabase/ssr`), no nos preocuparíamos de "Pestañas inyectando ráfagas de eventos de `SIGNED_IN` al despertar".

¿Por qué? Porque el navegador simplemente hace una petición HTTP a una ruta de Next (Ej: vas a un dashboard o llamas a un Server Action). Esa petición pasa primero por el Middleware *antes de correr ningún código de React*:

```typescript
// Ejemplo resumido de middleware.ts en Next.js
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  
  // 1. Iniciamos el cliente conectándolo a las Cookies de la petición que despertó tras inactividad
  const supabase = createServerClient('URL', 'KEY', {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookies) {
        // Renueva automáticamente en el background el JWT si estaba cerca de expirar
        cookies.forEach(c => supabaseResponse.cookies.set(c.name, c.value, c.options))
      },
    }
  });

  // 2. Comprobamos la Auth real
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/app_protegida')) {
    // Si la inactividad realmente mató la sesión permanentemente, hace Redirect(307) HTTP
    // ¡0% de posibilidades de Pantalla Blanca en el navegador!
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse;
}
```

### Conclusión para Next.js:
En Next.js prescindirías totalmente de tener tu archivo masivo `SessionContext` o tu deduplicador de eventos. Eliminas el problema de la "pantalla blanca por ráfaga de inactividad de 2 minutos" porque todo request "se purifica" validando cookies frescas (manejadas automáticamente por `@supabase/ssr` en el campo `setAll`) cada vez que hablas con los Server Components de React, haciendo que tu aplicación sea estructuralmente a prueba de "pestañas dormidas".
