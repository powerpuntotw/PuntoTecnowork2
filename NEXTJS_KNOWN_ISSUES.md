# Punto Tecnowork - Next.js Migration Known Issues
**URGENTE - LEER ANTES DE RECONSTRUIR LA APLICACIÓN**

Este documento detalla los tres (3) problemas arquitectónicos críticos descubiertos durante la primera migración de Vite a Next.js (App Router). Es **imperativo** que en la nueva construcción desde cero se apliquen estas lecciones para evitar pantallas en blanco, congelamiento de pestañas y pérdida de estabilidad.

---

## 1. El Congelamiento de Pestaña ("Thundering Herd" RSC Flood)
**Síntoma:** Cuando un usuario cambia a otra pestaña del navegador y deja el Dashboard inactivo por un par de minutos, al volver (activar el foco de la pestaña), la pantalla se queda congelada en blanco y requiere presionar F5.
**Causa:** Next.js App Router incluye un pre-fetch agresivo por defecto. Al dispararse el evento `visibilitychange = visible` en el navegador, Next.js intenta re-validar e hidratar simultáneamente *todos* los componentes `<Link>` que existen en la pantalla. Como los dashboards tienen barras laterales (Admin/Local) o menús inferiores (Cliente) con múltiples botones, Next.js dispara peticiones SSR/RSC masivas de golpe, frizando el hilo de React (React Root RSC Queue) y bloqueando el navegador.

**Solución Obligatoria para la Nueva App:**
1. **NO usar `<Link>` nativo para navegaciones dinámicas:** Crear un componente unificado `SmartLink.jsx` (o `.tsx`) que desactive explícitamente el prefetch automático.
```jsx
// components/SmartLink.jsx
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export const SmartLink = ({ href, children, ...props }) => {
    const router = useRouter();
    const handlePrefetch = () => { if (typeof href === "string") router.prefetch(href); };

    return (
        <Link 
            href={href} 
            prefetch={false} // BLOQUEA el prefetch masivo
            onMouseEnter={handlePrefetch} // Sólo carga si el usuario intenta hacer click
            onTouchStart={handlePrefetch}
            {...props}
        >
            {children}
        </Link>
    );
};
```
2. **Desactivar el Client Router Filter:** En `next.config.js` agregar la propiedad experimental para que el App Router no se atrape en el caché local.
```javascript
experimental: { clientRouterFilter: false }
```

---

## 2. El "Deadlock" del Contexto de Autenticación
**Síntoma:** Al recargar la página directamente en rutas anidadas (ej. `/local/dashboard`), el proveedor de Supabase arroja parpadeos infinitos o bucles entre "Cargando..." y una redirección hacia `/login`.
**Causa:** El uso de hooks como `useRouter()` y `.onAuthStateChanged()` combinados con banderas de estado tipo `initializedRef` o `mountRef` que desincronizan el Single Truth (La verdad absoluta) de Supabase con el State de React. Las carreras de renderización en Next.js (SSR vs CSR) causan que el listener no emita eventos o asuma que el usuario no existe.

**Solución Obligatoria para la Nueva App:**
1. Separar el cliente de Supabase en un patrón **Singleton** puro fuera del componente de React de manera que no se reinstancie entre navegaciones:
```javascript
// lib/supabase/client.js
import { createBrowserClient } from '@supabase/ssr'
let supabaseClient = null;
export function createClient() {
  if (!supabaseClient) supabaseClient = createBrowserClient(URL, ANON_KEY);
  return supabaseClient;
}
```
2. Simplificar radicalmente `AuthContext`. Depender únicamente de `supabase.auth.getSession()` inicial, para luego registrar el `.onAuthStateChanged()` eliminando referencias externas frágiles (`useEffect` dependencies limpias).

---

## 3. Peticiones Fantasma (Heartbeats sin control de Inactividad)
**Síntoma:** Envío silencioso e infinito de llamadas a Supabase incluso con la pestaña escondida.
**Causa:** Elementos como el "Detector de si un Local está abierto" usan `setInteral` ciegamente. Si el contador (`setInterval(sendHeartbeat, 180000)`) se queda en una pestaña oculta por 6 horas, ejecuta múltiples llamadas en cola de red que al volver el usuario explotan juntas.

**Solución Obligatoria para la Nueva App:**
Acompañar cualquier `setInterval` de `Supabase` o actualización automatizada verificando la visibilidad del documento para interrumpir los latidos.
```javascript
const sendHeartbeat = async () => {
    if (document.visibilityState === 'hidden') return; // SALVAGUARDA CRÍTICA
    // llamadas supabase
};
```

---

## 4. Requisito Arquitectónico General: Programación Orientada a Objetos (OOP)
**Instrucción Estricta:** Toda la nueva arquitectura y refactorización principal de lógica de negocio (como clases controladoras, servicios del backend, utilidades matemáticas o lógica de Supabase no reactiva) **deberá estar estructurada utilizando Programación Orientada a Objetos (OOP).** Se espera ver encapsulamiento, uso de clases y patrones de diseño claros donde sea aplicable, para maximizar la mantenibilidad del código y su escalabilidad a futuro.

---

*Por favor entrega este documento como Prompt Guía a Antigravity (o cualquier agente) durante la reconstrucción mañana para prevenir perder todo el avance en estabilización que logramos hoy.*
