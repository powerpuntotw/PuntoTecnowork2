import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = await createClient();
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && session) {
            const { user } = session;

            // Check if profile exists
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile) {
                // New user logic
                await supabase.from('profiles').insert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                    avatar_url: user.user_metadata?.avatar_url || '',
                    user_type: 'client'
                });

                await supabase.from('points_accounts').insert({
                    user_id: user.id,
                    current_points: 0,
                    lifetime_points: 0,
                    tier_level: 'bronze'
                });

                return NextResponse.redirect(`${origin}/cliente/dashboard`);
            }

            // Existing user redirect
            const DASHBOARDS = {
                admin: '/admin/dashboard',
                local: '/local/dashboard',
                client: '/cliente/dashboard'
            };

            return NextResponse.redirect(`${origin}${DASHBOARDS[profile.user_type] || next}`);
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
