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
        console.log(`[AuthContext] fetchProfile called for ${userId}, attempt ${attempt}`);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
            if (error) {
                console.error('[AuthContext] fetchProfile database error:', error);
                throw error;
            }
            if (data) {
                console.log(`[AuthContext] fetchProfile success. Setting profile data. Profile Role: ${data.user_type}`);
                setProfile(data);
            } else {
                console.warn(`[AuthContext] fetchProfile found no profile for ${userId} in the database.`);
            }
            return data;
        } catch (err) {
            if (attempt < 3) {
                console.warn(`[AuthContext] fetchProfile attempt ${attempt} failed, retrying in 1s...`);
                await new Promise(r => setTimeout(r, 1000));
                return fetchProfile(userId, attempt + 1);
            }
            console.error('[AuthContext] fetchProfile failed after 3 attempts:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        console.group('🚀 [AuthContext] Mount & Initialization');
        console.log(`[AuthContext] Component mounted. Initial loading state: ${loading}`);

        let mounted = true;
        let authSubscription = null;
        let safetyTimeout = null;

        const initializeAuth = async () => {
            console.log('[AuthContext] initializeAuth() execution started.');
            try {
                console.log('[AuthContext] Calling supabase.auth.getSession()...');
                // getSession is synchronous with local storage / cookies.
                // It does not hit the network to validate the token, making it instant and reliable.
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('[AuthContext] getSession() returned an error:', error);
                    throw error;
                }

                if (session?.user) {
                    console.log(`[AuthContext] getSession() found active session for user: ${session.user.id}`);
                    setUser(session.user);
                    console.log('[AuthContext] Awaiting fetchProfile()...');
                    await fetchProfile(session.user.id);
                    console.log('[AuthContext] fetchProfile() completed during initialization.');
                } else {
                    console.log('[AuthContext] getSession() found NO active session (user is null).');
                    setUser(null);
                    setProfile(null);
                }
            } catch (err) {
                console.error("[AuthContext] Catch block reached inside initializeAuth:", err);
                setUser(null);
                setProfile(null);
            } finally {
                if (mounted) {
                    console.log('[AuthContext] initializeAuth() finally block reached. Setting loading = false.');
                    setLoading(false);
                    if (safetyTimeout) {
                        console.log('[AuthContext] Clearing 10s safety timeout.');
                        clearTimeout(safetyTimeout);
                    }
                } else {
                    console.warn('[AuthContext] initializeAuth() finished but component is unmounted.');
                }
                console.groupEnd(); // End the group here
            }
        };

        // Initialize explicitly on mount. This guarantees it runs even in React StrictMode remounts
        // where INITIAL_SESSION events might be swallowed by the Supabase client.
        initializeAuth();

        // Safety timeout: if Supabase getSession() hangs while refreshing a token, or fetchProfile hangs
        safetyTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.error('🚨 [AuthContext] SAFETY TIMEOUT TRIGGERED (10s). Forcing loading = false. Something is hanging or State is out of sync!');
                setLoading(false);
            }
        }, 10000);

        // Listen for subsequent state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`📡 [AuthContext] onAuthStateChange event received: ${event}`);
                if (!mounted) {
                    console.warn(`[AuthContext] Ignored ${event} because component is unmounted.`);
                    return;
                }

                if (event === 'SIGNED_IN') {
                    if (session?.user) {
                        console.log(`[AuthContext] Processing SIGNED_IN for user ${session.user.id}`);
                        // Do NOT setLoading(true) here to prevent trapping the UI if a background refresh occurs
                        setUser(session.user);
                        await fetchProfile(session.user.id);
                        console.log(`[AuthContext] Profile fetched after SIGNED_IN.`);
                    }
                } else if (event === 'TOKEN_REFRESHED') {
                    if (session?.user) {
                        console.log(`[AuthContext] Processing TOKEN_REFRESHED`);
                        setUser(session.user);
                    }
                } else if (event === 'SIGNED_OUT') {
                    console.log(`[AuthContext] Processing SIGNED_OUT`);
                    setUser(null);
                    setProfile(null);
                    if (mounted) setLoading(false);
                }
            }
        );

        authSubscription = subscription;

        return () => {
            console.log('🧹 [AuthContext] Component unmounting. Cleaning up timers and subscriptions.');
            mounted = false;
            if (safetyTimeout) clearTimeout(safetyTimeout);
            authSubscription?.unsubscribe();
        };
    }, [fetchProfile, loading]);

    const signInWithGoogle = async () => {
        console.log('[AuthContext] Calling signInWithGoogle()');
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
        console.log('[AuthContext] Calling signOut()');
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
