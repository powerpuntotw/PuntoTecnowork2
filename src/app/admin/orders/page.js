'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, Filter, ArrowRight, MapPin, User, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG = {
    pendiente: { label: 'Pendiente', color: 'bg-accent text-gray-dark', hex: '#FFC905' },
    en_proceso: { label: 'En Proceso', color: 'bg-secondary text-white', hex: '#0093D8' },
    paused: { label: 'Pausado', color: 'bg-red-500 text-white', hex: '#EB1C24' },
    listo: { label: 'Listo', color: 'bg-success text-white', hex: '#A4CC39' },
    entregado: { label: 'Entregado', color: 'bg-green-700 text-white', hex: '#2D7A2D' },
    cancelado: { label: 'Cancelado', color: 'bg-primary text-white', hex: '#EB1C24' },
};

const supabase = createClient();

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                let query = supabase
                    .from('print_orders')
                    .select('*, profiles!print_orders_customer_id_fkey(full_name, email), printing_locations!print_orders_location_id_fkey(name)')
                    .order('created_at', { ascending: false });

                if (filter) query = query.eq('status', filter);

                const { data } = await query;
                setOrders(data || []);
            } catch (err) {
                console.error('Orders fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [filter]);

    const filtered = search
        ? orders.filter(o =>
            o.order_number.toLowerCase().includes(search.toLowerCase()) ||
            o.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            o.printing_locations?.name?.toLowerCase().includes(search.toLowerCase())
        )
        : orders;

    if (loading) return <div className="p-4 space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="shimmer h-16 rounded-2xl" />)}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase">Gestión Global de Órdenes</h2>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-black text-gray-medium uppercase tracking-widest">Total:</span>
                    <span className="text-sm font-black text-primary">{filtered.length}</span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por #Orden, Cliente o Local..."
                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="pl-12 pr-10 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm appearance-none font-bold text-sm min-w-[200px]"
                    >
                        <option value="">Todos los Estados</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full min-w-[1000px]">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Orden</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Cliente</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Local / Destino</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Estado</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Monto</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Fecha</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map((o, i) => (
                                <motion.tr
                                    key={o.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="hover:bg-gray-50/80 transition-colors group"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-black text-primary text-sm tracking-tight">{o.order_number}</span>
                                            <span className="text-[10px] font-bold text-gray-300 uppercase">{o.id.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-black text-[10px]">
                                                {o.profiles?.full_name?.charAt(0) || <User className="w-3 h-3" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-dark">{o.profiles?.full_name || 'Desconocido'}</span>
                                                <span className="text-[10px] text-gray-medium">{o.profiles?.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-gray-dark">
                                            <MapPin className="w-3.5 h-3.5 text-success" />
                                            <span className="text-sm font-bold">{o.printing_locations?.name || 'Central'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${STATUS_CONFIG[o.status]?.color} shadow-sm inline-block`}>
                                            {STATUS_CONFIG[o.status]?.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-black text-gray-dark text-lg tracking-tighter transform group-hover:scale-110 transition-transform inline-block">
                                            ${o.total_amount.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-gray-medium">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="text-[11px] font-medium">{format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all text-gray-200 hover:text-primary">
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <Package className="w-16 h-16 text-gray-100 mb-4" />
                        <p className="text-gray-medium font-black uppercase tracking-widest text-xs">No se encontraron órdenes</p>
                    </div>
                )}
            </div>
        </div>
    );
}
