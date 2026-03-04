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
                // CRITICAL FIX: Use getUser() instead of getSession()
                // getUser() validates the token against Supabase Auth server
                // getSession() only reads from local storage and can return stale/expired sessions
                const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

                if (userError) {
                    // Session is invalid or expired - clean up stale tokens
                    console.error('Auth validation error:', userError.message);
                    await supabase.auth.signOut();
                    setUser(null);
                    setProfile(null);
                    return; // stopLoading will be called in finally
                }

                if (currentUser && mounted) {
                    lastSessionIdRef.current = currentUser.id;
                    setUser(currentUser);
                    await fetchProfile(currentUser.id);
                }
            } catch (err) {
                console.error('Auth initialization failed:', err);
                // On any unexpected error, ensure clean state to prevent empty dashboard
                setUser(null);
                setProfile(null);
            } finally {
                stopLoading();
            }
        };

        if (!initializedRef.current) {
            initializedRef.current = true;

            // Safety timeout: if getUser() hangs (known Supabase bug #35754),
            // force sign out and redirect to login instead of showing empty dashboard
            initTimeout = setTimeout(() => {
                if (mounted) {
                    setLoading(prev => {
                        if (prev) {
                            console.warn('AuthContext - Safety timeout triggered, cleaning session');
                            // CRITICAL: Clean stale session on timeout instead of just stopping loading.
                            // Without this, user may have stale data but null profile = empty dashboard.
                            supabase.auth.signOut({ scope: 'global' }).then(() => {
                                if (mounted) {
                                    setUser(null);
                                    setProfile(null);
                                    // Force full page reload to /login so middleware re-evaluates with clean cookies
                                    window.location.href = '/login';
                                }
                            });
                            return false;
                        }
                        return prev;
                    });
                }
            }, 8000);

            initialize();
        } else {
            stopLoading();
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                // Avoid processing duplicate events
                const eventKey = `${event}-${session?.user?.id || 'none'}`;
                if (lastProcessedEventRef.current === eventKey) {
                    return;
                }
                lastProcessedEventRef.current = eventKey;

                if (event === 'SIGNED_IN' && session?.user) {
                    // Skip if same session already initialized (prevents re-render on tab focus)
                    if (initializedRef.current && lastSessionIdRef.current === session.user.id) {
                        return;
                    }

                    if (mounted) setLoading(true);
                    lastSessionIdRef.current = session.user.id;
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                    if (mounted) setLoading(false);
                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                    // Token was refreshed - update user silently without loading state
                    setUser(session.user);
                } else if (event === 'SIGNED_OUT') {
                    lastSessionIdRef.current = null;
                    lastProcessedEventRef.current = null;
                    setUser(null);
                    setProfile(null);
                }
            }
        );

        return () => {
            mounted = false;
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
