'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Star, Clock, Check, Printer, Truck, AlertCircle, MessageCircle, Send, CheckCircle2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG = {
    pendiente: { label: 'Pendiente', color: 'bg-accent text-gray-dark' },
    en_proceso: { label: 'En Proceso', color: 'bg-secondary text-white' },
    paused: { label: 'Revisión Requerida', color: 'bg-red-100 text-red-600 border border-red-200' },
    listo: { label: 'Listo', color: 'bg-success text-white' },
    entregado: { label: 'Entregado', color: 'bg-green-700 text-white' },
    cancelado: { label: 'Cancelado', color: 'bg-primary text-white' },
};

const formatSize = (s) => ({ a4: 'A4', a3: 'A3', oficio: 'Oficio (Legal)', '10x15': '10x15 cm', '13x18': '13x18 cm', foto_a4: 'A4 (Foto)' }[s] || s);

const supabase = createClient();

export default function OrdersPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();

    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderTickets, setOrderTickets] = useState({});
    const [chatOrder, setChatOrder] = useState(null);

    const fetchOrdersAndTickets = async () => {
        if (!user) return;
        const { data: oData } = await supabase.from('print_orders').select('*').eq('customer_id', user.id).order('created_at', { ascending: false });
        setOrders(oData || []);

        if (oData?.length > 0) {
            const pausedOrdersIds = oData.filter(o => o.status === 'paused').map(o => o.id);
            if (pausedOrdersIds.length > 0) {
                const { data: tData } = await supabase
                    .from('support_tickets')
                    .select('*')
                    .in('order_id', pausedOrdersIds)
                    .eq('status', 'open');

                if (tData) {
                    const ticketMap = {};
                    tData.forEach(t => ticketMap[t.order_id] = t);
                    setOrderTickets(ticketMap);
                }
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOrdersAndTickets();

        const channel = supabase.channel(`client-orders-${user?.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'print_orders', filter: `customer_id=eq.${user?.id}` },
                (payload) => setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o))
            ).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]);

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    if (loading) return <div className="p-6 space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="shimmer h-20 rounded-xl" />)}</div>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold text-gray-dark mb-4">Mis Órdenes</h2>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
                {['all', ...Object.keys(STATUS_CONFIG)].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className={`px-3 py-2 rounded-full whitespace-nowrap text-xs font-medium transition-all ${filter === s ? 'bg-primary text-white' : 'bg-white text-gray-medium border border-gray-200'}`}>
                        {s === 'all' ? 'Todas' : STATUS_CONFIG[s].label}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-medium mx-auto mb-3 opacity-30" />
                    <p className="text-gray-medium">No hay órdenes para mostrar</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((order, i) => (
                        <motion.div key={order.id} className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
                            onClick={() => setSelectedOrder(order)}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-primary">{order.order_number}</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${STATUS_CONFIG[order.status]?.color}`}>{STATUS_CONFIG[order.status]?.label}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-medium">{format(new Date(order.created_at), "d 'de' MMM, HH:mm", { locale: es })}</span>
                                <span className="font-bold text-gray-dark">${order.total_amount}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {selectedOrder && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                        onClick={() => setSelectedOrder(null)}>
                        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                                <h3 className="font-bold text-gray-dark">Detalle de Orden</h3>
                                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-medium" /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                                    <span className="font-bold text-primary">{selectedOrder.order_number}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_CONFIG[selectedOrder.status]?.color}`}>{STATUS_CONFIG[selectedOrder.status]?.label}</span>
                                </div>

                                {selectedOrder.status === 'paused' && orderTickets[selectedOrder.id] && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2 text-red-700">
                                            <AlertCircle className="w-5 h-5" />
                                            <h4 className="font-bold">Acción Requerida</h4>
                                        </div>
                                        <p className="text-sm text-gray-medium mb-3">{orderTickets[selectedOrder.id].description}</p>
                                        <button onClick={() => { setSelectedOrder(null); setChatOrder(selectedOrder); }}
                                            className="w-full bg-primary text-white flex justify-center items-center gap-2 py-3 rounded-xl text-sm font-bold shadow-brand">
                                            <MessageCircle className="w-4 h-4" /> Abrir Chat de Soporte
                                        </button>
                                    </div>
                                )}

                                <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-medium">Tamaño:</span> <span className="font-bold">{formatSize(selectedOrder.specifications?.size)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-medium">Copias:</span> <span className="font-bold">{selectedOrder.specifications?.copies}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-medium">Total:</span> <span className="font-black text-lg">${selectedOrder.total_amount}</span></div>
                                </div>

                                {selectedOrder.notes && (
                                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                        <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Notas</p>
                                        <p className="text-sm text-gray-medium italic">{selectedOrder.notes}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {chatOrder && (
                    <OrderIssueChat
                        order={chatOrder}
                        onClose={() => { setChatOrder(null); fetchOrdersAndTickets(); }}
                        supabase={supabase}
                        user={user}
                        showToast={showToast}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function OrderIssueChat({ order, onClose, supabase, user, showToast }) {
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fetchTicket = async () => {
            const { data } = await supabase.from('support_tickets').select('*').eq('order_id', order.id).eq('status', 'open').maybeSingle();
            if (data) setTicket(data);
        };
        fetchTicket();
    }, [order.id]);

    useEffect(() => {
        if (!ticket) return;
        const fetchMessages = async () => {
            const { data } = await supabase.from('ticket_messages').select('*, sender:profiles(full_name, user_type)').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
            if (data) {
                setMessages(data);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        };
        fetchMessages();
        const sub = supabase.channel(`chat-${ticket.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticket.id}` }, fetchMessages).subscribe();
        return () => supabase.removeChannel(sub);
    }, [ticket]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        setSending(true);
        const { error } = await supabase.from('ticket_messages').insert({ ticket_id: ticket.id, sender_id: user.id, message: newMessage.trim() });
        if (!error) setNewMessage('');
        setSending(false);
    };

    const resolveProblem = async () => {
        if (!confirm('¿Marcar como resuelto? Se reanudará la impresión.')) return;
        const { error: tErr } = await supabase.from('support_tickets').update({ status: 'resolved' }).eq('id', ticket.id);
        const { error: oErr } = await supabase.from('print_orders').update({ status: 'en_proceso' }).eq('id', order.id);
        if (!tErr && !oErr) {
            showToast('Problema resuelto', 'success');
            onClose();
        }
    };

    if (!ticket) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl h-[80vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sm:rounded-t-2xl">
                    <div>
                        <h3 className="font-bold text-gray-dark">Soporte: {order.order_number}</h3>
                        <p className="text-[10px] text-gray-medium uppercase font-bold tracking-tighter">Chat con el local</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={resolveProblem} className="bg-success text-white px-3 py-1.5 rounded-lg text-xs font-bold">Resolver</button>
                        <button onClick={onClose} className="p-2 text-gray-400"><X className="w-5 h-5" /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-sm">
                        <p className="font-bold text-indigo-900 mb-1">Motivo del local:</p>
                        <p className="text-indigo-800">{ticket.description}</p>
                    </div>
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm ${msg.sender_id === user.id ? 'bg-primary text-white rounded-br-none' : 'bg-gray-100 text-gray-dark rounded-bl-none'}`}>
                                <p>{msg.message}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-2">
                    <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribí un mensaje..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none" />
                    <button disabled={!newMessage.trim() || sending} className="bg-primary text-white p-2 rounded-xl disabled:opacity-50"><Send className="w-5 h-5" /></button>
                </form>
            </motion.div>
        </motion.div>
    );
}
