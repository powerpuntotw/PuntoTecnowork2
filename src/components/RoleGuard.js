'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export const RoleGuard = ({ children, allowedRoles }) => {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [waitingForProfile, setWaitingForProfile] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (profile) {
                if (!allowedRoles.includes(profile.user_type)) {
                    // Redirect to their own dashboard
                    const DASHBOARDS = {
                        admin: '/admin/dashboard',
                        local: '/local/dashboard',
                        client: '/cliente/dashboard'
                    };
                    router.push(DASHBOARDS[profile.user_type] || '/login');
                } else if (profile.user_type === 'client') {
                    // Check for onboarding completion
                    const isProfileIncomplete = !profile.phone || !profile.dni;
                    if (isProfileIncomplete && !pathname.includes('/profile')) {
                        router.push('/cliente/profile?onboarding=true');
                    }
                }
            } else if (user && !profile) {
                // User exists but profile hasn't loaded yet — wait a bit then redirect to login
                setWaitingForProfile(true);
            }
        }
    }, [user, profile, loading, allowedRoles, router, pathname]);

    // If user exists but profile never arrives, redirect to login after 5 seconds
    useEffect(() => {
        if (!waitingForProfile) return;
        const timeout = setTimeout(() => {
            if (!profile) {
                router.push('/login');
            }
        }, 5000);
        return () => clearTimeout(timeout);
    }, [waitingForProfile, profile, router]);

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
