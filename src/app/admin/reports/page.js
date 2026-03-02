'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Download, Calendar, Filter, Loader, TrendingUp, DollarSign, Package, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#EB1C24', '#2D2D2D', '#FFC905', '#0093D8', '#10B981'];
const STATUS_LABELS = { pendiente: 'Espera', en_proceso: 'Proceso', listo: 'Listo', entregado: 'Entregado', cancelado: 'Baja' };

const supabase = createClient();

export default function AdminReportsPage() {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [locations, setLocations] = useState([]);
    const [ordersByStatus, setOrdersByStatus] = useState([]);
    const [revenueByLocation, setRevenueByLocation] = useState([]);
    const [timeline, setTimeline] = useState([]);

    const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [locationFilter, setLocationFilter] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            let query = supabase.from('print_orders')
                .select('id, status, total_amount, location_id, created_at')
                .gte('created_at', startOfDay(new Date(dateFrom + 'T00:00:00')).toISOString())
                .lte('created_at', endOfDay(new Date(dateTo + 'T00:00:00')).toISOString());

            if (locationFilter) query = query.eq('location_id', locationFilter);

            const [ordersRes, locsRes] = await Promise.all([
                query,
                supabase.from('printing_locations').select('id, name'),
            ]);

            const data = ordersRes.data || [];
            const locs = locsRes.data || [];
            setOrders(data);
            setLocations(locs);

            const locMap = locs.reduce((m, l) => { m[l.id] = l.name; return m; }, {});

            const statusCount = data.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
            setOrdersByStatus(Object.entries(statusCount).map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value })));

            const revByLoc = data.reduce((acc, o) => {
                const locName = locMap[o.location_id] || 'S/A';
                acc[locName] = (acc[locName] || 0) + Number(o.total_amount);
                return acc;
            }, {});
            setRevenueByLocation(Object.entries(revByLoc).map(([name, total]) => ({ name, total: Math.round(total) })));

            const byDay = data.reduce((acc, o) => {
                const day = format(new Date(o.created_at), 'dd/MM');
                if (!acc[day]) acc[day] = { day, orders: 0, revenue: 0 };
                acc[day].orders++;
                acc[day].revenue += Number(o.total_amount);
                return acc;
            }, {});
            setTimeline(Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)));
        } catch (err) {
            console.error('Reports error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [dateFrom, dateTo, locationFilter]);

    const exportCSV = () => {
        const header = 'Estado,Monto,Fecha\n';
        const rows = orders.map(o => `${o.status},${o.total_amount},${format(new Date(o.created_at), 'yyyy-MM-dd')}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Metricas_${dateFrom}.csv`;
        a.click();
    };

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders = orders.length;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl"><TrendingUp className="w-6 h-6 text-primary" /></div>
                        Inteligencia de Negocio
                    </h2>
                    <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest mt-1">Análisis profundo de rendimientos y métricas</p>
                </div>
                <button onClick={exportCSV} className="bg-success text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-brand flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                    <Download className="w-4 h-4" /> Bajar Data (CSV)
                </button>
            </div>

            {/* Global Filters */}
            <div className="bg-white rounded-[32px] p-8 shadow-xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-3 h-3" /> Desde</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 font-bold text-xs" />
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-3 h-3" /> Hasta</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 font-bold text-xs" />
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-3 h-3" /> Filtrar Sucursal</label>
                    <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 font-bold text-xs">
                        <option value="">Consolidado Global</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard icon={<Package className="text-secondary" />} label="Volumen de Órdenes" value={totalOrders} color="secondary" />
                <KPICard icon={<DollarSign className="text-success" />} label="Facturación Total" value={`$${totalRevenue.toLocaleString()}`} color="success" />
                <KPICard icon={<TrendingUp className="text-primary" />} label="Ticket Promedio" value={`$${totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0}`} color="primary" />
                <KPICard icon={<Filter className="text-indigo-400" />} label="Locales Activos" value={locations.length} color="indigo" />
            </div>

            {loading ? (
                <div className="py-40 flex flex-col items-center justify-center space-y-6">
                    <Loader className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Generando algoritmos visuales...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Time Series */}
                    <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100 lg:col-span-2">
                        <div className="mb-8">
                            <h3 className="text-xs font-black text-gray-dark uppercase tracking-widest">Tendencia de Rendimiento</h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Comparativa entre facturación y flujo de órdenes diarias</p>
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={timeline}>
                                    <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }} />
                                    <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }} />
                                    <Line yAxisId="left" type="step" dataKey="orders" name="Órdenes" stroke="#2D2D2D" strokeWidth={4} dot={false} activeDot={{ r: 8, stroke: '#fff', strokeWidth: 4 }} />
                                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Ingresos" stroke="#EB1C24" strokeWidth={4} dot={false} activeDot={{ r: 8, stroke: '#fff', strokeWidth: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Categorical Distribution */}
                    <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100">
                        <h3 className="text-xs font-black text-gray-dark uppercase tracking-widest mb-10">Status de Operaciones</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                                        {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', shadow: 'xl' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100">
                        <h3 className="text-xs font-black text-gray-dark uppercase tracking-widest mb-10">Competitividad por Sucursal</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueByLocation}>
                                    <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#F9FAFB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#D1D5DB' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#D1D5DB' }} />
                                    <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '20px', border: 'none' }} />
                                    <Bar dataKey="total" name="Facturación" radius={[12, 12, 12, 12]} barSize={40}>
                                        {revenueByLocation.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#EB1C24' : '#2D2D2D'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function KPICard({ icon, label, value, color }) {
    return (
        <div className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-4 relative z-10">
                <div className={`p-4 rounded-2xl bg-${color}/10`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{label}</p>
                    <p className="text-xl font-black text-gray-dark tracking-tighter mt-1">{value}</p>
                </div>
            </div>
            <div className={`absolute -bottom-10 -right-10 w-24 h-24 bg-${color}/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />
        </div>
    );
}
