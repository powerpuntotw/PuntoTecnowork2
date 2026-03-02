'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Package, Users, Gift, LogOut, User, DollarSign, LifeBuoy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DynamicLogo } from '@/components/DynamicLogo';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSupportBadge } from '@/hooks/useSupportBadge';
import { motion } from 'framer-motion';
import { SmartLink } from '@/components/SmartLink';

const navItems = [
    { path: '/local/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/local/orders', icon: Package, label: 'Órdenes' },
    { path: '/local/clients', icon: Users, label: 'Clientes' },
    { path: '/local/prices', icon: DollarSign, label: 'Precios' },
    { path: '/local/redemptions', icon: Gift, label: 'Canjes' },
    { path: '/local/support', icon: LifeBuoy, label: 'Soporte' },
    { path: '/local/profile', icon: User, label: 'Perfil' },
];

export default function LocalLayout({ children }) {
    const { profile, signOut, loading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { unreadCount, resetCount } = useSupportBadge();

    useEffect(() => {
        if (!authLoading && (!profile || profile.user_type !== 'local')) {
            router.push('/login');
        }
    }, [profile, authLoading, router]);

    useEffect(() => {
        if (pathname.startsWith('/local/support')) resetCount();
    }, [pathname, resetCount]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    if (authLoading || (profile && profile.user_type !== 'local')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-gray-dark to-gray-800 px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <DynamicLogo type="principal" className="h-8 object-contain" />
                    <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />
                    <div className="hidden sm:flex flex-col">
                        <span className="text-white font-black text-[10px] uppercase tracking-widest leading-none">Terminal Sucursal</span>
                        <span className="text-white/60 text-[9px] font-bold uppercase tracking-tighter mt-1">{profile?.full_name}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle className="text-white/60 hover:text-white transition-colors" />
                    <button onClick={handleSignOut} className="bg-white/5 hover:bg-white/10 p-2 text-white/60 hover:text-white rounded-xl transition-all group">
                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </header>

            {/* Tabs Navigation */}
            <nav className="bg-white border-b border-gray-100 flex items-center px-4 sticky top-[68px] z-40 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 mx-auto max-w-7xl w-full">
                    {navItems.map(({ path, icon: Icon, label }) => {
                        const isActive = pathname === path;
                        return (
                            <SmartLink key={path} href={path} className={`flex items-center gap-2 px-6 py-4 border-b-4 transition-all whitespace-nowrap relative ${isActive ? 'border-primary text-gray-dark shadow-[0_10px_20px_-10px_rgba(235,28,36,0.1)]' : 'border-transparent text-gray-medium hover:text-gray-dark hover:bg-gray-50'}`}>
                                <div className="relative">
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                                    {path === '/local/support' && unreadCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full border-2 border-white animate-pulse" />
                                    )}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
                                {isActive && (
                                    <div className="absolute inset-0 bg-primary/5 -z-10 transition-all" />
                                )}
                            </SmartLink>
                        );
                    })}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    {children}
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
