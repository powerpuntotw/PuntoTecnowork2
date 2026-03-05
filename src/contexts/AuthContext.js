'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';

const AuthContext = createContext({});
const supabase = createClient();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const fetchingRef = useRef(false);

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

        const handleAuthEvent = async (event, session) => {
            if (!mounted) return;

            if (event === 'INITIAL_SESSION') {
                if (session?.user) {
                    // Session exists in cookies — load profile
                    fetchingRef.current = true;
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                    fetchingRef.current = false;
                    if (mounted) setLoading(false);
                } else {
                    // No session in cookies. DON'T set loading=false yet!
                    // Wait a moment for potential SIGNED_IN event (fresh OAuth redirect)
                    setTimeout(() => {
                        if (mounted && !fetchingRef.current) {
                            setLoading(false);
                        }
                    }, 2000);
                }
            } else if (event === 'SIGNED_IN' && session?.user) {
                fetchingRef.current = true;
                setUser(session.user);
                await fetchProfile(session.user.id);
                fetchingRef.current = false;
                if (mounted) setLoading(false);
            } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                setUser(session.user);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                if (mounted) setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthEvent);

        // Safety: if nothing resolves within 15 seconds, stop loading
        const safetyTimeout = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 15000);

        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
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
