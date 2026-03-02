'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Upload, Gift, Star, Package, ArrowRight, MapPin, Camera, Clock, Wifi } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createClient();
const TIER_CONFIG = {
    bronze: { label: '🥉 BRONCE', gradient: 'from-amber-700 to-amber-500', next: 'Silver', nextPoints: 1000 },
    silver: { label: '🥈 PLATA', gradient: 'from-gray-400 to-gray-300', next: 'Gold', nextPoints: 2000 },
    gold: { label: '✨ GOLD ✨', gradient: 'from-yellow-500 to-amber-400', next: 'Diamond', nextPoints: 3000 },
    diamond: { label: '💎 DIAMOND', gradient: 'from-cyan-400 to-blue-500', next: null, nextPoints: null },
};

export default function ClienteDashboardPage() {
    const { user } = useAuth();
    const [pointsData, setPointsData] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        const fetchData = async () => {
            try {
                const [pointsRes, ordersRes, locsRes] = await Promise.all([
                    supabase.from('points_accounts').select('*').eq('user_id', user.id).maybeSingle(),
                    supabase.from('print_orders').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(5),
                    supabase.from('printing_locations').select('id, name, address, is_open, last_active_at, has_fotoya').eq('status', 'activo').order('name')
                ]);
                setPointsData(pointsRes.data);
                setRecentOrders(ordersRes.data || []);
                setLocations(locsRes.data || []);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user?.id]);

    const tier = TIER_CONFIG[pointsData?.tier_level || 'bronze'];
    const points = pointsData?.current_points || 0;
    const lifetimePoints = pointsData?.lifetime_points || 0;
    const progressPercent = tier.nextPoints
        ? Math.min(100, Math.round((lifetimePoints / tier.nextPoints) * 100))
        : 100;
    const pointsToNext = tier.nextPoints ? Math.max(0, tier.nextPoints - lifetimePoints) : 0;

    const STATUS_COLORS = {
        pendiente: 'bg-accent text-gray-dark',
        en_proceso: 'bg-secondary text-white',
        listo: 'bg-success text-white',
        entregado: 'bg-green-700 text-white',
        cancelado: 'bg-primary text-white',
    };

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="shimmer h-32 rounded-2xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Points Card */}
            <motion.div
                className={`relative overflow-hidden rounded-2xl shadow-brand-lg p-6 bg-gradient-to-br ${tier.gradient}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="flex items-center justify-center mb-4">
                    <div className="bg-white/30 backdrop-blur-sm rounded-full px-6 py-2">
                        <span className="text-white font-bold text-lg">{tier.label}</span>
                    </div>
                </div>

                <div className="text-center mb-6">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}>
                        <div className="text-6xl font-bold text-white mb-1">{points}</div>
                        <div className="text-white text-xl font-medium opacity-90">PUNTOS</div>
                    </motion.div>
                </div>

                {tier.next && (
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <p className="text-white text-sm mb-2">Progreso al siguiente nivel:</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-white/30 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-white rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 1, delay: 0.3 }} />
                            </div>
                            <span className="text-white font-bold text-sm">{progressPercent}%</span>
                        </div>
                        <p className="text-white text-xs mt-2 opacity-90">{pointsToNext} pts más para {tier.next}</p>
                    </div>
                )}

                <Link href="/cliente/points-history" className="block text-center mt-4">
                    <span className="text-white/80 text-xs underline hover:text-white transition-colors">Ver historial de puntos →</span>
                </Link>
            </motion.div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                <Link href="/cliente/upload">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className="bg-primary rounded-xl p-5 text-white shadow-brand cursor-pointer h-full">
                        <Upload className="w-8 h-8 mb-2" />
                        <p className="font-bold">Subir Archivos</p>
                        <p className="text-xs opacity-80 mt-1">Fotos y documentos</p>
                    </motion.div>
                </Link>
                <Link href="/cliente/rewards">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className="bg-success rounded-xl p-5 text-white shadow-lg cursor-pointer h-full">
                        <Gift className="w-8 h-8 mb-2" />
                        <p className="font-bold">Premios</p>
                        <p className="text-xs opacity-80 mt-1">Canjeá tus puntos</p>
                    </motion.div>
                </Link>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-dark flex items-center gap-2">
                        <Package className="w-5 h-5 text-secondary" /> Órdenes Recientes
                    </h3>
                    <Link href="/cliente/orders" className="text-primary text-sm font-medium flex items-center gap-1">
                        Ver todas <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                {recentOrders.length === 0 ? (
                    <p className="text-gray-medium text-sm text-center py-6">No tienes órdenes aún</p>
                ) : (
                    <div className="space-y-3">
                        {recentOrders.map((order, i) => (
                            <motion.div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}>
                                <div>
                                    <p className="font-bold text-sm text-gray-dark">{order.order_number}</p>
                                    <p className="text-xs text-gray-medium">${order.total_amount}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                                        {order.status.replace('_', ' ')}
                                    </span>
                                    {order.points_earned > 0 && (
                                        <span className="text-success text-xs font-bold flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-current" />+{order.points_earned}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Available Locations */}
            <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-dark flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" /> Red de Locales
                    </h3>
                </div>
                {locations.length === 0 ? (
                    <p className="text-gray-medium text-sm text-center py-6">No hay locales disponibles</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {locations.map((loc, i) => {
                            const isOnline = loc.last_active_at && (new Date() - new Date(loc.last_active_at)) < (5 * 60 * 1000);
                            const actuallyOpen = loc.is_open && isOnline;

                            return (
                                <motion.div key={loc.id} className={`p-4 rounded-xl border ${actuallyOpen ? 'bg-success/5 border-success/20' : 'bg-gray-50 border-gray-100'} flex justify-between items-center transition-colors`}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                                    whileHover={{ scale: 1.01 }}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-gray-dark text-sm leading-none">{loc.name}</h4>
                                            {loc.has_fotoya && (
                                                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <Camera className="w-3 h-3" /> FotoYa
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-medium truncate pr-4">{loc.address}</p>
                                    </div>
                                    <div className="flex items-center flex-col gap-1 items-end min-w-[70px]">
                                        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${actuallyOpen ? 'bg-success/20 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                            {actuallyOpen ? <><Wifi className="w-3 h-3" /> Abierto</> : <><Clock className="w-3 h-3" /> Cerrado</>}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            <Link href="/cliente/upload">
                <motion.button className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary text-white rounded-full shadow-brand-lg flex items-center justify-center border-2 border-white"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Upload className="w-6 h-6" />
                </motion.button>
            </Link>
        </div>
    );
}
