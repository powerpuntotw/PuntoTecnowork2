import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Get the current user session. This also refreshes the token if needed.
    const { data: { user } } = await supabase.auth.getUser();

    // Determine if it's a protected route
    const isProtectedRoute =
        request.nextUrl.pathname.startsWith('/admin') ||
        request.nextUrl.pathname.startsWith('/cliente') ||
        request.nextUrl.pathname.startsWith('/local');

    // Redirect to login if unauthenticated user tries to access a protected route
    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // If an authenticated user goes to /login, let them through.
    // They may be in the process of signing out (cookies still present but client-side session cleared).
    // The AuthContext on the client side will handle the redirect to the correct dashboard if they are truly logged in.
    // This avoids a redirect loop between middleware and AuthContext during sign-out.

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match request paths that need auth checking.
         * Excludes static files, images, and Next.js internals.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
    ],
};
