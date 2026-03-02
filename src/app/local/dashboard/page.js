'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Package, DollarSign, Clock, CheckCircle, TrendingUp, Printer, CalendarDays, Power, Wifi, Loader, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

const supabase = createClient();

export default function LocalDashboardPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        today: 0,
        revenue: 0,
        pending: 0,
        printing: 0,
        ready: 0,
        completed: 0,
        weekRevenue: 0,
        pointsAwardedTotal: 0
    });
    const [isOpen, setIsOpen] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        if (!profile?.location_id) return;

        const fetchInitData = async () => {
            try {
                const { data: locData } = await supabase
                    .from('printing_locations')
                    .select('is_open')
                    .eq('id', profile.location_id)
                    .single();
                if (locData) setIsOpen(locData.is_open !== false);

                const { data } = await supabase.from('print_orders')
                    .select('*, profiles!print_orders_customer_id_fkey(full_name)')
                    .eq('location_id', profile.location_id)
                    .order('created_at', { ascending: false });

                const allOrders = data || [];
                setOrders(allOrders);

                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const todayOrders = allOrders.filter(o => format(new Date(o.created_at), 'yyyy-MM-dd') === todayStr);

                setStats({
                    today: todayOrders.length,
                    revenue: todayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
                    pending: allOrders.filter(o => o.status === 'pendiente').length,
                    printing: allOrders.filter(o => o.status === 'en_proceso').length,
                    ready: allOrders.filter(o => o.status === 'listo').length,
                    completed: allOrders.filter(o => o.status === 'entregado').length,
                    weekRevenue: allOrders.filter(o => new Date(o.created_at) > subDays(new Date(), 7)).reduce((s, o) => s + Number(o.total_amount), 0),
                    pointsAwardedTotal: allOrders.reduce((s, o) => s + Number(o.points_earned || 0), 0),
                });
            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitData();

        // Visibility-aware heartbeat: pauses when tab is hidden
        let interval = null;
        const sendHeartbeat = async () => {
            if (document.visibilityState === 'hidden') return;
            try {
                await supabase.from('printing_locations')
                    .update({ last_active_at: new Date().toISOString() })
                    .eq('id', profile.location_id);
            } catch (e) { /* ignore heartbeat errors */ }
        };

        const startHeartbeat = () => {
            if (interval) clearInterval(interval);
            sendHeartbeat();
            interval = setInterval(sendHeartbeat, 180000);
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                startHeartbeat();
            } else {
                if (interval) clearInterval(interval);
            }
        };

        startHeartbeat();
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            if (interval) clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [profile?.location_id]);

    const toggleOpenStatus = async () => {
        setUpdatingStatus(true);
        const nextState = !isOpen;
        try {
            const { error } = await supabase.from('printing_locations').update({ is_open: nextState }).eq('id', profile.location_id);
            if (error) throw error;
            setIsOpen(nextState);
            showToast(`Sucursal ${nextState ? 'Abierta' : 'Cerrada'}`, 'success');
        } catch (err) {
            showToast('Error de conexión', 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    // ... same functionality, just different UI
    if (loading) return <div className="p-8"><div className="shimmer h-[70vh] rounded-xl" /></div>;

    const needsAttention = stats.pending + stats.printing;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Status Header */}
            <div className={`p-4 rounded-xl flex items-center justify-between border ${isOpen ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-300'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full text-white ${isOpen ? 'bg-green-500' : 'bg-gray-400'}`}>
                        {isOpen ? <Wifi className="w-6 h-6" /> : <Power className="w-6 h-6" />}
                    </div>
                    <div>
                        <h2 className="text-lg text-gray-800">
                            <span className="font-bold">Estado: </span>
                            <span className={`font-black ${isOpen ? 'text-green-600' : 'text-gray-600'}`}>
                                {isOpen ? 'ABIERTO' : 'CERRADO'}
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500">
                            {isOpen ? 'Los clientes pueden ver el local como disponible.' : 'La sucursal no recibe nuevas órdenes.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={toggleOpenStatus}
                    disabled={updatingStatus}
                    className={`px-6 py-2 rounded-lg font-bold text-white transition-opacity disabled:opacity-50 ${isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                >
                    {updatingStatus ? '...' : (isOpen ? 'Marcar como CERRADO' : 'Marcar como ABIERTO')}
                </button>
            </div>

            {/* Top 5 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-[#00AEEF] text-white rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <Package className="w-6 h-6 mb-2 opacity-80" />
                    <div className="text-3xl font-black">{stats.today}</div>
                    <div className="text-sm font-medium opacity-90">Órdenes hoy</div>
                </div>
                <div className="bg-[#FFC107] text-white rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <TrendingUp className="w-6 h-6 mb-2 opacity-80" />
                    <div className="text-3xl font-black">+{stats.pointsAwardedTotal} pts</div>
                    <div className="text-sm font-medium opacity-90">Puntos entregados (Total)</div>
                </div>
                <div className="bg-[#4CAF50] text-white rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <DollarSign className="w-6 h-6 mb-2 opacity-80" />
                    <div className="text-3xl font-black">${stats.revenue.toLocaleString()}</div>
                    <div className="text-sm font-medium opacity-90">Ingresos hoy</div>
                </div>
                <div className="bg-[#475569] text-white rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <Clock className="w-6 h-6 mb-2 opacity-80" />
                    <div className="text-3xl font-black">{stats.pending}</div>
                    <div className="text-sm font-medium opacity-90">Pendientes</div>
                </div>
                <div className="bg-[#EF4444] text-white rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <Printer className="w-6 h-6 mb-2 opacity-80" />
                    <div className="text-3xl font-black">{stats.printing}</div>
                    <div className="text-sm font-medium opacity-90">Imprimiendo</div>
                </div>
            </div>

            {/* Bottom 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#ecfccb] text-[#3f6212] rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <CheckCircle className="w-8 h-8 opacity-70" />
                    <div>
                        <div className="text-2xl font-black">{stats.ready}</div>
                        <div className="text-xs font-bold uppercase opacity-80">Listas para retirar</div>
                    </div>
                </div>
                <div className="bg-[#dcfce7] text-[#166534] rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <Package className="w-8 h-8 opacity-70" />
                    <div>
                        <div className="text-2xl font-black">{stats.completed}</div>
                        <div className="text-xs font-bold uppercase opacity-80">Entregadas (total)</div>
                    </div>
                </div>
                <div className="bg-[#e0f2fe] text-[#075985] rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <TrendingUp className="w-8 h-8 opacity-70" />
                    <div>
                        <div className="text-2xl font-black">${stats.weekRevenue.toLocaleString()}</div>
                        <div className="text-xs font-bold uppercase opacity-80">Ingresos 7 dias</div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" /> Actividad Reciente
                    </h3>
                    <button onClick={() => router.push('/local/orders')} className="text-sm text-blue-600 hover:underline">
                        Ver todas &rarr;
                    </button>
                </div>
                <div className="divide-y divide-gray-100">
                    {orders.slice(0, 5).map(order => (
                        <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-12 w-1/2">
                                <span className="font-bold text-red-600 text-sm">#{order.order_number}</span>
                                <span className="text-sm text-gray-700">{order.profiles?.full_name || 'Desconocido'}</span>
                            </div>
                            <div className="flex items-center gap-8 w-1/2 justify-end">
                                <span className="font-bold text-gray-900">${order.total_amount.toLocaleString()}</span>
                                <StatusBadge status={order.status} />
                                <span className="text-xs text-gray-500 font-medium">
                                    {format(new Date(order.created_at), 'dd/MM HH:mm')}
                                </span>
                            </div>
                        </div>
                    ))}
                    {orders.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No hay actividad reciente.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const config = {
        pendiente: { bg: 'bg-yellow-100 text-yellow-800', label: 'Pendiente' },
        en_proceso: { bg: 'bg-blue-100 text-blue-800', label: 'Proceso' },
        listo: { bg: 'bg-green-100 text-green-800', label: 'Listo' },
        entregado: { bg: 'bg-gray-100 text-gray-600', label: 'Entregado' },
        cancelado: { bg: 'bg-red-100 text-red-800', label: 'Cancelado' },
    };
    const c = config[status] || config.pendiente;
    return (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${c.bg}`}>
            {c.label}
        </span>
    );
}

function subDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
}
