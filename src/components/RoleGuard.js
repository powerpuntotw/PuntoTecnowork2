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
                // No session at all — go to login
                router.push('/login');
            } else if (profile && !allowedRoles.includes(profile.user_type)) {
                // Profile loaded but wrong role — redirect to correct dashboard
                const DASHBOARDS = {
                    admin: '/admin/dashboard',
                    local: '/local/dashboard',
                    client: '/cliente/dashboard'
                };
                router.push(DASHBOARDS[profile.user_type] || '/login');
            }
            // If user exists but profile is null — do NOTHING, wait for it to load
            // The AuthContext safety timeout (10s) handles truly stuck sessions
        }
    }, [user, profile, loading, allowedRoles, router]);

    // Show spinner while loading OR while waiting for profile
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
