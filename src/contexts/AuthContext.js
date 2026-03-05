'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';

const AuthContext = createContext({});
const supabase = createClient();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const initializedRef = useRef(false);

    const fetchProfile = useCallback(async (userId, attempt = 1) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
            if (error) throw error;
            if (data) setProfile(data);
            return data;
        } catch (err) {
            if (attempt < 3) {
                await new Promise(r => setTimeout(r, 1000));
                return fetchProfile(userId, attempt + 1);
            }
            console.error('fetchProfile failed:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        let safetyTimeout = null;

        const initialize = async () => {
            // Only run once — React StrictMode may remount but we don't re-initialize
            if (initializedRef.current) {
                if (mounted) setLoading(false);
                return;
            }
            initializedRef.current = true;

            try {
                // Use getSession() for fast local read (no network call, no hang risk).
                // The middleware already validates tokens server-side with getUser().
                // If the session is stale, Supabase queries will fail and user will be redirected.
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error || !session?.user) {
                    if (mounted) {
                        setUser(null);
                        setProfile(null);
                    }
                    return;
                }

                if (mounted) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                }
            } catch (err) {
                console.error('Auth initialization failed:', err);
                if (mounted) {
                    setUser(null);
                    setProfile(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                    if (safetyTimeout) clearTimeout(safetyTimeout);
                }
            }
        };

        // Safety timeout: if getSession + fetchProfile hang for any reason
        safetyTimeout = setTimeout(() => {
            if (mounted) {
                console.warn('AuthContext - Safety timeout triggered (10s)');
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        }, 10000);

        initialize();

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                if (event === 'SIGNED_IN' && session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                    if (mounted) setLoading(false);
                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                    setUser(session.user);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    if (mounted) setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            if (safetyTimeout) clearTimeout(safetyTimeout);
            subscription?.unsubscribe();
        };
    }, [fetchProfile]);

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    prompt: 'select_account',
                },
            }
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut({ scope: 'global' });
        setUser(null);
        setProfile(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, fetchProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
