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
    const lastSessionIdRef = useRef(null);

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
        // Prevent double-init but allow StrictMode remount by resetting in cleanup
        if (initializedRef.current) return;
        initializedRef.current = true;

        let mounted = true;
        let initTimeout;

        const initialize = async () => {
            try {
                const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

                if (userError) {
                    console.error('Auth validation error:', userError.message);
                    await supabase.auth.signOut();
                    setUser(null);
                    setProfile(null);
                    return;
                }

                if (currentUser && mounted) {
                    lastSessionIdRef.current = currentUser.id;
                    setUser(currentUser);
                    await fetchProfile(currentUser.id);
                }
            } catch (err) {
                console.error('Auth initialization failed:', err);
                setUser(null);
                setProfile(null);
            } finally {
                if (mounted) setLoading(false);
                if (initTimeout) clearTimeout(initTimeout);
            }
        };

        // Safety timeout: if getUser() hangs, force loading to false
        initTimeout = setTimeout(() => {
            if (mounted) {
                console.warn('AuthContext - Safety timeout triggered');
                setLoading(false);
            }
        }, 10000);

        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                if (event === 'SIGNED_IN' && session?.user) {
                    // Skip if same session already loaded (prevents re-fetch on tab focus)
                    if (lastSessionIdRef.current === session.user.id) {
                        return;
                    }
                    setLoading(true);
                    lastSessionIdRef.current = session.user.id;
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                    if (mounted) setLoading(false);
                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                    setUser(session.user);
                } else if (event === 'SIGNED_OUT') {
                    lastSessionIdRef.current = null;
                    setUser(null);
                    setProfile(null);
                    if (mounted) setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            initializedRef.current = false; // Reset for StrictMode remount
            if (initTimeout) clearTimeout(initTimeout);
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
        // scope: 'global' ensures all sessions are terminated including server-side cookies
        await supabase.auth.signOut({ scope: 'global' });
        setUser(null);
        setProfile(null);
        // Use window.location.href (not router.push) to force full page reload
        // This ensures the middleware re-evaluates with clean cookies
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, fetchProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
