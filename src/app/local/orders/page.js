'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, CheckCircle, Printer, Eye, FileText, AlertTriangle, RefreshCw, Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintManager } from '@/components/local/PrintManager';

const STATUS_LABELS = {
    pendiente: { label: 'Cola', color: 'bg-amber-400 text-gray-dark', icon: Clock },
    en_proceso: { label: 'Taller', color: 'bg-primary text-white', icon: Printer },
    listo: { label: 'Listo', color: 'bg-success text-white', icon: CheckCircle },
    entregado: { label: 'Archivo', color: 'bg-gray-dark text-white', icon: Package },
};

const formatSize = (s) => ({ a4: 'A4', a3: 'A3', oficio: 'Oficio (Legal)', '10x15': '10x15 cm', '13x18': '13x18 cm', foto_a4: 'A4 (Foto)' }[s] || s);

const supabase = createClient();

export default function LocalOrdersPage() {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [reviewOrder, setReviewOrder] = useState(null);
    const [confirmDelivery, setConfirmDelivery] = useState(null);

    useEffect(() => {
        if (!profile?.location_id) return;

        const fetchOrders = async () => {
            try {
                const { data, error } = await supabase.from('print_orders')
                    .select('*, profiles!print_orders_customer_id_fkey(full_name, email)')
                    .eq('location_id', profile.location_id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setOrders(data || []);
            } catch (err) {
                console.error('Orders error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();

        const channel = supabase.channel(`local-orders-${profile.location_id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'print_orders', filter: `location_id=eq.${profile.location_id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setOrders(prev => [payload.new, ...prev]);
                        showToast(`Nueva orden #${payload.new.order_number}`, 'info');
                    } else if (payload.eventType === 'UPDATE') {
                        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
                    }
                }
            ).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.location_id]);

    const changeStatus = async (orderId, newStatus) => {
        try {
            const updates = { status: newStatus };
            if (newStatus === 'entregado') updates.completed_at = new Date().toISOString();
            const { error } = await supabase.from('print_orders').update(updates).eq('id', orderId);
            if (error) throw error;
            showToast(`Estado: ${STATUS_LABELS[newStatus]?.label}`, 'success');
        } catch (err) {
            showToast('Error de red', 'error');
        }
    };

    const grouped = {
        pendiente: orders.filter(o => o.status === 'pendiente'),
        en_proceso: orders.filter(o => o.status === 'en_proceso'),
        listo: orders.filter(o => o.status === 'listo'),
        entregado: orders.filter(o => o.status === 'entregado').slice(0, 10),
    };

    if (loading) return <div className="p-8 space-y-6">{[1, 2, 3].map(i => <div key={i} className="shimmer h-40 rounded-[40px]" />)}</div>;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl"><Package className="w-6 h-6 text-primary" /></div>
                        Mesa de Control
                    </h2>
                    <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest mt-1">Gestión operativa en tiempo real</p>
                </div>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                {Object.entries(grouped).map(([status, items]) => {
                    const sl = STATUS_LABELS[status];
                    return (
                        <div key={status} className="bg-white rounded-[40px] p-6 shadow-xl border border-gray-100 min-h-[400px] flex flex-col">
                            <div className="flex items-center justify-between mb-8 px-2">
                                <h3 className="text-[10px] font-black text-gray-dark uppercase tracking-[0.2em] flex items-center gap-2">
                                    <sl.icon className="w-4 h-4 text-primary" /> {sl.label}
                                </h3>
                                <div className="bg-gray-50 px-3 py-1 rounded-full text-[10px] font-black text-gray-400">{items.length}</div>
                            </div>

                            <div className="space-y-4 flex-1">
                                {items.map(order => (
                                    <motion.div key={order.id} layout layoutId={order.id}
                                        className={`rounded-3xl p-5 border shadow-sm transition-all group ${status === 'en_proceso' ? 'bg-primary/5 border-primary/20 scale-[1.02]' : 'bg-gray-50/50 border-gray-100 hover:bg-white hover:shadow-xl'}`}>

                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-sm font-black text-gray-dark tracking-tighter">#{order.order_number}</span>
                                            <span className="text-[9px] font-bold text-gray-400">{format(new Date(order.created_at), 'HH:mm')}</span>
                                        </div>

                                        <p className="text-xs font-black text-gray-dark uppercase tracking-tight mb-4 truncate">{order.profiles?.full_name || 'Consumidor'}</p>

                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100"><Eye className="w-3 h-3 text-gray-medium" /></div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{order.file_urls?.length || 0} Docs</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-primary">${order.total_amount.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="space-y-2">
                                            {status === 'pendiente' && (
                                                <button onClick={() => setReviewOrder(order)} className="w-full bg-primary text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-brand hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                    <FileText className="w-4 h-4" /> Inspeccionar
                                                </button>
                                            )}
                                            {status === 'en_proceso' && (
                                                <button onClick={() => setSelectedOrder(order)} className="w-full bg-gray-dark text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                    <Printer className="w-4 h-4 animate-pulse" /> Abrir Taller
                                                </button>
                                            )}
                                            {status === 'listo' && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setConfirmDelivery(order)} className="flex-1 bg-success text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-brand hover:scale-105 active:scale-95 transition-all">
                                                        Entregar
                                                    </button>
                                                    <button onClick={() => setSelectedOrder({ ...order, _reprintMode: true })} className="p-3 bg-gray-dark text-white rounded-2xl hover:scale-105 transition-all">
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                {items.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                        <sl.icon className="w-8 h-8 mb-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Despejado</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modals are handled by AnimatePresence in the layout or here */}
            <AnimatePresence>
                {reviewOrder && <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)} onAccept={() => { changeStatus(reviewOrder.id, 'en_proceso'); setSelectedOrder(reviewOrder); setReviewOrder(null); }} />}
                {confirmDelivery && <DeliveryModal order={confirmDelivery} onClose={() => setConfirmDelivery(null)} onConfirm={() => { changeStatus(confirmDelivery.id, 'entregado'); setConfirmDelivery(null); }} />}
                {selectedOrder && <PrintManager order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={(id, st) => { setOrders(prev => prev.map(o => o.id === id ? { ...o, status: st } : o)); setSelectedOrder(null); }} />}
            </AnimatePresence>
        </div>
    );
}

function ReviewModal({ order, onClose, onAccept }) {
    return (
        <div className="fixed inset-0 bg-gray-dark/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
                <div className="p-10 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-xl font-black text-gray-dark tracking-tighter uppercase mb-1">Ficha de Producción</h3>
                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Orden #{order.order_number}</p>
                </div>
                <div className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <SpecBox label="Tamaño" value={formatSize(order.specifications?.size)} />
                        <SpecBox label="Color" value={order.specifications?.color ? '🎨 Color' : '⚫ B&N'} />
                        <SpecBox label="Copias" value={order.specifications?.copies} />
                        <SpecBox label="Precio" value={`$${order.total_amount}`} />
                    </div>
                    {order.notes && (
                        <div className="p-6 bg-amber-400/5 rounded-3xl border border-amber-400/20">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Notas Especiales</p>
                            <p className="text-sm font-medium text-gray-dark italic">"{order.notes}"</p>
                        </div>
                    )}
                    <div className="flex gap-4 pt-4">
                        <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-dark py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-gray-200">Cancelar</button>
                        <button onClick={onAccept} className="flex-1 bg-primary text-white py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-brand hover:scale-105 transition-all">Empezar Taller</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function DeliveryModal({ order, onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 bg-gray-dark/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-10 flex flex-col items-center text-center">
                <div className="p-6 bg-success/10 rounded-full mb-6 text-success"><CheckCircle className="w-12 h-12" /></div>
                <h3 className="text-xl font-black text-gray-dark tracking-tighter uppercase mb-2">¿Entregar Pedido?</h3>
                <p className="text-xs font-medium text-gray-medium leading-relaxed mb-8 px-4">Al confirmar se acreditarán los puntos al cliente y la orden quedará cerrada permanentemente.</p>
                <div className="flex flex-col w-full gap-3">
                    <button onClick={onConfirm} className="w-full bg-success text-white py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-brand hover:scale-105 transition-all">Confirmar Entrega</button>
                    <button onClick={onClose} className="w-full py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">Regresar</button>
                </div>
            </motion.div>
        </div>
    );
}

function SpecBox({ label, value }) {
    return (
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-black text-gray-dark uppercase">{value}</p>
        </div>
    );
}
