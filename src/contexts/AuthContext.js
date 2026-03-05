'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';

const AuthContext = createContext({});
const supabase = createClient();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

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
        let authSubscription = null;

        const initializeAuth = async () => {
            try {
                // getSession is synchronous with local storage / cookies.
                // It does not hit the network to validate the token, making it instant and reliable.
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else {
                    setUser(null);
                    setProfile(null);
                }
            } catch (err) {
                console.error("Auth init error:", err);
                setUser(null);
                setProfile(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        // Initialize explicitly on mount. This guarantees it runs even in React StrictMode remounts
        // where INITIAL_SESSION events might be swallowed by the Supabase client.
        initializeAuth();

        // Listen for subsequent state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                if (event === 'SIGNED_IN') {
                    if (session?.user) {
                        setLoading(true);
                        setUser(session.user);
                        await fetchProfile(session.user.id);
                        if (mounted) setLoading(false);
                    }
                } else if (event === 'TOKEN_REFRESHED') {
                    if (session?.user) {
                        setUser(session.user);
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    if (mounted) setLoading(false);
                }
            }
        );

        authSubscription = subscription;

        return () => {
            mounted = false;
            authSubscription?.unsubscribe();
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
