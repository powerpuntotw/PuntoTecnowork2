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
    const lastProcessedEventRef = useRef(null);

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
        let initTimeout;

        const stopLoading = () => {
            if (mounted) setLoading(false);
            if (initTimeout) clearTimeout(initTimeout);
        };

        const initialize = async () => {
            try {
                // Return early if we already have the profile loaded
                if (user && profile) {
                    stopLoading();
                    return;
                }

                // Use getUser() to ensure token is validated
                const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

                if (userError || !currentUser) {
                    console.error('Auth validation issue or no user:', userError?.message);
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
                stopLoading();
            }
        };

        // Safety timeout in case everything hangs
        initTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('AuthContext - Safety timeout triggered');
                setUser(null);
                setProfile(null);
            }
        }, 8000);

        // Always run initialize. In StrictMode it might run twice, but React 18 
        // will just fetch again, which is perfectly safe and necessary.
        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                // Process SIGNED_IN or INITIAL_SESSION
                if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
                    // Prevent duplicate fetches if already loaded the exact same session
                    if (lastSessionIdRef.current === session.user.id && profile) {
                        return;
                    }
                    if (mounted) setLoading(true);
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
            if (initTimeout) clearTimeout(initTimeout);
            subscription?.unsubscribe();
        };
    }, [fetchProfile, user, profile, loading]);

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
