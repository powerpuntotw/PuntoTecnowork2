'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export const RoleGuard = ({ children, allowedRoles }) => {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (profile && !allowedRoles.includes(profile.user_type)) {
                // Redirect to their own dashboard
                const DASHBOARDS = {
                    admin: '/admin/dashboard',
                    local: '/local/dashboard',
                    client: '/cliente/dashboard'
                };
                router.push(DASHBOARDS[profile.user_type] || '/login');
            }
        }
    }, [user, profile, loading, allowedRoles, router]);

    // Show spinner while loading OR while user exists but profile hasn't loaded yet
    // This does NOT redirect — it waits for the AuthContext to finish loading the profile
    // The AuthContext has its own safety timeout (8s) that handles truly stuck sessions
    if (loading || !user || !profile || !allowedRoles.includes(profile.user_type)) {
        return (
            <div className="min-h-screen bg-gray-light flex items-center justify-center">
                <div className="space-y-4 text-center">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                    <p className="text-gray-medium text-sm animate-pulse">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    return children;
};
