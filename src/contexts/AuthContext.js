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
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('Auth session error:', error);
                }

                if (session?.user && mounted) {
                    lastSessionIdRef.current = session.user.id;
                    setUser(session.user);
                    // Crucial: Wait for the profile to load before releasing the loading lock
                    await fetchProfile(session.user.id);
                }
            } catch (err) {
                console.error('getSession failed:', err);
            } finally {
                // Now we are safe to render the app
                stopLoading();
            }
        };

        if (!initializedRef.current) {
            initializedRef.current = true;

            // Safety timeout to prevent eternal loading if init gets stuck
            // We only trigger if it's currently loading, and we don't depend on `loading` state from React
            initTimeout = setTimeout(() => {
                if (mounted) {
                    setLoading(prev => {
                        if (prev) {
                            console.warn('AuthContext - Safety timeout triggered, forcing load to finish');
                            return false;
                        }
                        return prev;
                    });
                }
            }, 5000);

            initialize();
        } else {
            // Already initialized, just stop loading
            stopLoading();
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                // MECANISMO 1: Evitar procesar ráfagas del MISMO evento re-disparado al despertar la pestaña
                const eventKey = `${event}-${session?.user?.id || 'none'}`;
                if (lastProcessedEventRef.current === eventKey) {
                    return; // Si es el evento que acaba de ocurrir, no hacemos NADA
                }
                lastProcessedEventRef.current = eventKey;

                // MECANISMO 2: El candado contra re-inicializaciones por inactividad
                if (event === 'SIGNED_IN' && session?.user) {
                    if (initializedRef.current && lastSessionIdRef.current === session.user.id) {
                        return; // Aborta aquí. Evita la pantalla blanca por resync del profile tras inactividad
                    }

                    if (mounted) setLoading(true);
                    lastSessionIdRef.current = session.user.id;
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                    if (mounted) setLoading(false);
                } else if (event === 'SIGNED_OUT') {
                    lastSessionIdRef.current = null;
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
            }
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
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
