'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Users, MapPin, DollarSign, TrendingUp, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const supabase = createClient();
const TIER_COLORS = { bronze: '#6B7280', silver: '#9CA3AF', gold: '#FFC905', diamond: '#0093D8' };

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({ users: 0, orders: 0, locations: 0, revenue: 0, totalPoints: 0 });
    const [tierData, setTierData] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [usersRes, recentOrdersRes, locsRes, pointsRes, totalOrdersRes] = await Promise.all([
                    supabase.from('profiles').select('id', { count: 'exact' }),
                    supabase.from('print_orders').select('*').order('created_at', { ascending: false }).limit(10),
                    supabase.from('printing_locations').select('id, name, is_open, last_active_at, status'),
                    supabase.from('points_accounts').select('tier_level, lifetime_points'),
                    supabase.from('print_orders').select('id, total_amount')
                ]);

                const recentOrders = recentOrdersRes.data || [];
                const allOrdersForStats = totalOrdersRes.data || [];
                const allLocs = locsRes.data || [];
                const activeLocs = allLocs.filter(l => l.status === 'activo');
                const revenue = allOrdersForStats.reduce((s, o) => s + Number(o.total_amount || 0), 0);
                const totalPoints = (pointsRes.data || []).reduce((s, p) => s + Number(p.lifetime_points || 0), 0);

                setStats({
                    users: usersRes.count || 0,
                    orders: allOrdersForStats.length,
                    locations: activeLocs.length,
                    revenue,
                    totalPoints,
                    locationDetails: activeLocs
                });
                setRecentOrders(recentOrders);

                const tiers = (pointsRes.data || []).reduce((acc, p) => {
                    const tier = p.tier_level || 'bronze';
                    acc[tier] = (acc[tier] || 0) + 1;
                    return acc;
                }, {});
                setTierData(Object.entries(tiers).map(([tier, value]) => ({ name: tier, value })));
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const STATUS_COLORS = { pendiente: '#FFC905', en_proceso: '#0093D8', listo: '#A4CC39', entregado: '#2D7A2D', cancelado: '#EB1C24' };

    const kpis = [
        { label: 'Usuarios', value: stats.users, icon: Users, gradient: 'from-secondary to-cyan-400' },
        { label: 'Órdenes', value: stats.orders, icon: Package, gradient: 'from-primary to-orange-400' },
        { label: 'Puntos Emitidos', value: `✦ ${stats.totalPoints.toLocaleString()}`, icon: Star, gradient: 'from-accent to-yellow-500' },
        { label: 'Locales', value: stats.locations, icon: MapPin, gradient: 'from-success to-green-400' },
        { label: 'Ingresos', value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, gradient: 'from-gray-700 to-gray-900' },
    ];

    if (loading) return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <div key={i} className="shimmer h-28 rounded-xl" />)}</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-black text-gray-dark tracking-tighter">Vista General</h1>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {kpis.map((kpi, i) => (
                    <motion.div key={i} className={`bg-gradient-to-br ${kpi.gradient} rounded-2xl p-6 text-white shadow-lg border border-white/10`}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -2 }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{kpi.label}</p>
                                <p className="text-3xl font-black">{kpi.value}</p>
                            </div>
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                                <kpi.icon className="w-5 h-5" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center">
                    <h3 className="font-bold text-gray-dark mb-6 w-full text-left">Distribución por Nivel</h3>
                    <div className="w-full h-[250px]">
                        {tierData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={tierData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value"
                                        label={({ name, percent }) => `${String(name).toUpperCase()} ${(percent * 100).toFixed(0)}%`}>
                                        {tierData.map((entry, i) => <Cell key={i} fill={TIER_COLORS[entry.name] || '#6B7280'} stroke="none" />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-medium text-sm">Sin datos de niveles</div>
                        )}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <h3 className="font-bold text-gray-dark mb-6">Órdenes Recientes</h3>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto no-scrollbar">
                        {recentOrders.map(order => (
                            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-100/50 rounded-2xl transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] uppercase">
                                        {(order.order_number || '00').slice(-2)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs text-gray-dark group-hover:text-primary transition-colors">{order.order_number || 'N/A'}</p>
                                        <p className="text-[10px] font-medium text-gray-medium">${Number(order.total_amount || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase text-white shadow-sm"
                                    style={{ backgroundColor: STATUS_COLORS[order.status] || '#9CA3AF' }}>
                                    {String(order.status || 'desconocido').replace('_', ' ')}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-gray-dark flex items-center gap-3 text-lg">
                            <div className="p-2 bg-success/10 rounded-xl"><MapPin className="w-5 h-5 text-success" /></div>
                            Red Operativa <span className="text-gray-medium font-medium text-sm">(En Tiempo Real)</span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {(stats.locationDetails || []).map(loc => {
                            const isOnline = loc.last_active_at && (new Date() - new Date(loc.last_active_at)) < (5 * 60 * 1000);
                            return (
                                <div key={loc.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-gray-dark truncate">{loc.name}</span>
                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]' : 'bg-gray-300'}`} title={isOnline ? 'Activo' : 'Offline'} />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-tighter ${isOnline ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                            {isOnline ? 'Conectado' : 'Desconectado'}
                                        </div>
                                        <div className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-tighter ${loc.is_open ? 'bg-success/10 text-success' : 'bg-red-50 text-red-600'}`}>
                                            {loc.is_open ? 'Local Abierto' : 'Local Cerrado'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
