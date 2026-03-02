'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft, ChevronRight, Loader, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_COLORS = {
    delete_user: 'bg-primary/10 text-primary',
    update_role: 'bg-secondary/10 text-secondary',
    create_reward: 'bg-success/10 text-success',
    update_reward: 'bg-accent/10 text-accent',
    delete_reward: 'bg-primary/10 text-primary',
    create_location: 'bg-success/10 text-success',
    update_location: 'bg-secondary/10 text-secondary',
    update_profile: 'bg-primary/10 text-primary',
};

const supabase = createClient();

export default function AdminAuditPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const PAGE_SIZE = 25;

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const { data, count } = await supabase
                    .from('admin_audit_logs')
                    .select('*, profiles!admin_audit_logs_admin_id_fkey(full_name, email)', { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
                setLogs(data || []);
                setTotal(count || 0);
            } catch (err) {
                console.error('AuditLogs fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [page]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                    <div className="p-2 bg-gray-dark/10 rounded-xl"><Shield className="w-6 h-6 text-gray-dark" /></div>
                    Registro de Auditoría
                </h2>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-black text-gray-medium uppercase tracking-widest">Registros Totales:</span>
                    <span className="text-sm font-black text-gray-dark">{total}</span>
                </div>
            </div>

            <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                    <h3 className="text-[10px] font-black text-gray-medium uppercase tracking-[0.3em]">Actividad del Sistema</h3>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center space-y-4">
                        <Loader className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest">Indexando registros...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-center px-4">
                        <Activity className="w-16 h-16 text-gray-100 mb-4" />
                        <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest">Sin actividad registrada</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {logs.map((log, i) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.01 }}
                                className="px-8 py-5 flex items-start gap-6 hover:bg-gray-50/80 transition-all group"
                            >
                                <div className="hidden sm:block mt-1">
                                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-400'}`}>
                                        {log.action?.replace(/_/g, ' ')}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mb-1">
                                        <span className="text-sm font-black text-gray-dark group-hover:text-primary transition-colors">
                                            {log.profiles?.full_name || log.profiles?.email || 'Sistema'}
                                        </span>
                                        <span className="text-xs text-gray-medium leading-relaxed font-medium">
                                            {log.details?.description}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-black uppercase text-gray-300 tracking-tighter">
                                            ID: {log.id.slice(0, 8)}
                                        </span>
                                        {log.target_type && (
                                            <span className="text-[9px] font-bold text-gray-200">
                                                • {log.target_type}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right flex flex-col items-end">
                                    <span className="text-[10px] font-black text-gray-dark uppercase tracking-tighter">
                                        {format(new Date(log.created_at), "d MMM", { locale: es })}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-300">
                                        {format(new Date(log.created_at), "HH:mm 'hs'", { locale: es })}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-8 py-6 border-t border-gray-50 bg-gray-50/10">
                        <span className="text-[10px] font-black text-gray-medium uppercase tracking-widest">
                            Mostrando {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} de {total}
                        </span>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-6 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 flex items-center gap-2 hover:shadow-md transition-all shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" /> Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={(page + 1) * PAGE_SIZE >= total}
                                className="px-6 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 flex items-center gap-2 hover:shadow-md transition-all shadow-sm"
                            >
                                Siguiente <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
