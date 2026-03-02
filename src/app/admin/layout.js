'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SmartLink } from '@/components/SmartLink';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, MapPin, Package, Gift, BarChart3, Settings, LogOut, Menu, X, Image, Shield, Inbox, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DynamicLogo } from '@/components/DynamicLogo';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSupportBadge } from '@/hooks/useSupportBadge';
import { RoleGuard } from '@/components/RoleGuard';

const sidebarItems = [
    { path: '/admin/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Usuarios' },
    { path: '/admin/locations', icon: MapPin, label: 'Locales' },
    { path: '/admin/orders', icon: Package, label: 'Órdenes' },
    { path: '/admin/rewards', icon: Gift, label: 'Premios' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reportes' },
    { path: '/admin/maintenance', icon: Settings, label: 'Mantenimiento' },
    { path: '/admin/support', icon: Inbox, label: 'Soporte' },
    { path: '/admin/branding', icon: Image, label: 'Branding' },
    { path: '/admin/audit', icon: Shield, label: 'Auditoría' },
    { path: '/admin/profile', icon: User, label: 'Perfil' },
];

export default function AdminLayout({ children }) {
    const { profile, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { unreadCount, resetCount } = useSupportBadge();

    useEffect(() => {
        if (pathname.startsWith('/admin/support')) resetCount();
    }, [pathname, resetCount]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <RoleGuard allowedRoles={['admin']}>
            <div className="min-h-screen bg-gray-light flex">
                {/* Sidebar overlay for mobile */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Sidebar */}
                <aside className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 w-64 bg-white shadow-lg z-50 flex flex-col border-r border-gray-200`}>
                    <div className="p-6 border-b border-gray-100 bg-white">
                        <DynamicLogo type="principal" className="h-10 object-contain mx-auto" />
                    </div>
                    <nav className="flex-1 py-4 overflow-y-auto no-scrollbar">
                        {sidebarItems.map(({ path, icon: Icon, label }) => {
                            const isActive = pathname === path;
                            return (
                                <SmartLink
                                    key={path}
                                    href={path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-6 py-3 text-sm font-bold transition-all relative ${isActive
                                        ? 'text-primary bg-primary/5 border-r-4 border-primary'
                                        : 'text-gray-medium hover:text-primary hover:bg-primary/5'
                                        }`}
                                >
                                    <div className="relative">
                                        <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                        {path === '/admin/support' && unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                                        )}
                                    </div>
                                    {label}
                                </SmartLink>
                            );
                        })}
                    </nav>
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                        <DynamicLogo type="footer1" className="h-6 object-contain mx-auto opacity-30 grayscale hover:grayscale-0 transition-all cursor-help" />
                    </div>
                </aside>

                {/* Main content */}
                <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                    {/* Top Header */}
                    <header className="hero-gradient px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-30 safe-top">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-black text-sm tracking-tight hidden sm:inline uppercase">Panel Admin</span>
                                <span className="text-white/60 font-medium text-xs hidden lg:inline mx-2">|</span>
                                <span className="text-white text-xs font-bold truncate max-w-[150px]">
                                    {sidebarItems.find(i => pathname === i.path)?.label || 'Escritorio'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <ThemeToggle className="text-white/80 hover:text-white transition-transform hover:rotate-12" />
                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/20">
                                <img
                                    src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'Admin'}&background=EB1C24&color=fff`}
                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=Admin&background=EB1C24&color=fff'; }}
                                    alt={profile?.full_name}
                                    className="w-7 h-7 rounded-full border border-white/30"
                                />
                                <span className="text-white text-[11px] font-black hidden md:inline tracking-tight">{profile?.full_name}</span>
                            </div>
                            <button onClick={handleSignOut} className="text-white/80 hover:text-white transition-all hover:scale-110">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </header>

                    {/* Content */}
                    <main className="flex-1 p-4 lg:p-8 bg-gray-light">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {children}
                        </motion.div>
                    </main>

                    <Footer className="bg-white border-t border-gray-100" />
                </div>
            </div>
        </RoleGuard>
    );
}
