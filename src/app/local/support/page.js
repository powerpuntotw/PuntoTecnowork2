'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, LifeBuoy, AlertCircle, CheckCircle2, Clock, X, ChevronRight, Send, ArrowLeft, User, Loader, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const SYSTEM_CATEGORIES = [
    'Falta de Insumos (Papel/Tóner)',
    'Falla de Impresora o Hardware',
    'Error en la Plataforma',
    'Consulta Administrativa',
    'Otro'
];

const supabase = createClient();

export default function LocalSupportPage() {
    const { profile } = useAuth();
    const { showToast } = useToast();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ category: SYSTEM_CATEGORIES[0], description: '' });

    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const [unreadTicketIds, setUnreadTicketIds] = useState(new Set());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTickets = async () => {
        if (!profile?.location_id) return;
        const { data } = await supabase.from('support_tickets').select('*, creator:profiles(full_name, user_type)').eq('location_id', profile.location_id).eq('ticket_type', 'system_report').order('created_at', { ascending: false });
        setTickets(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchTickets();
    }, [profile?.location_id]);

    useEffect(() => {
        if (!profile?.location_id) return;
        const ticketChannel = supabase.channel(`local-support-tickets`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets', filter: `location_id=eq.${profile.location_id}` }, (payload) => {
            if (payload.new.creator_id !== profile.id) {
                fetchTickets();
                setUnreadTicketIds(prev => new Set([...prev, payload.new.id]));
                showToast('💬 Nuevo chat del administrador', 'info');
            }
        }).subscribe();
        return () => supabase.removeChannel(ticketChannel);
    }, [profile?.location_id]);

    useEffect(() => {
        if (!activeTicket) return;
        const fetchMessages = async () => {
            const { data } = await supabase.from('ticket_messages').select('*, sender:profiles(full_name, user_type)').eq('ticket_id', activeTicket.id).order('created_at', { ascending: true });
            if (data) {
                setMessages(data);
                setTimeout(scrollToBottom, 100);
            }
        };
        fetchMessages();
        const sub = supabase.channel(`ticket_${activeTicket.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${activeTicket.id}` }, fetchMessages).subscribe();
        return () => supabase.removeChannel(sub);
    }, [activeTicket]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.description.trim()) return showToast('Agregá una descripción', 'error');
        setSubmitting(true);
        try {
            const { error } = await supabase.from('support_tickets').insert({ location_id: profile.location_id, creator_id: profile.id, ticket_type: 'system_report', category: form.category, description: form.description.trim() });
            if (error) throw error;
            showToast('Reporte enviado', 'success');
            setForm({ category: SYSTEM_CATEGORIES[0], description: '' });
            setShowForm(false);
            fetchTickets();
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        setSending(true);
        try {
            const { error } = await supabase.from('ticket_messages').insert({ ticket_id: activeTicket.id, sender_id: profile.id, message: newMessage.trim() });
            if (error) throw error;
            setNewMessage('');
        } finally {
            setSending(false);
        }
    };

    if (loading && !tickets.length) return <div className="p-8"><div className="shimmer h-[70vh] rounded-[40px]" /></div>;

    if (activeTicket) {
        return (
            <div className="h-[calc(100vh-200px)] flex flex-col bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden relative">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white z-10">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setActiveTicket(null)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all"><ArrowLeft className="w-5 h-5" /></button>
                        <div>
                            <h3 className="text-sm font-black text-gray-dark uppercase tracking-tighter">{activeTicket.category}</h3>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Ticket #{activeTicket.id.slice(0, 8)}</p>
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${activeTicket.status === 'open' ? 'bg-primary text-white shadow-brand' : 'bg-success/10 text-success'}`}>
                        {activeTicket.status === 'open' ? 'Abierto' : 'Resuelto ✓'}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/50 no-scrollbar">
                    <div className="flex justify-center mb-10">
                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm max-w-lg w-full text-center">
                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-2">Descripción del Reporte</p>
                            <p className="text-sm font-medium text-gray-dark italic leading-relaxed">"{activeTicket.description}"</p>
                        </div>
                    </div>

                    {messages.map((m, i) => {
                        const isMe = m.sender_id === profile.id;
                        return (
                            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-[32px] px-8 py-5 shadow-lg ${isMe ? 'bg-gray-dark text-white rounded-tr-none' : 'bg-white text-gray-dark rounded-tl-none border border-gray-100'}`}>
                                    <div className="flex items-center gap-2 mb-2 opacity-40">
                                        <p className="text-[8px] font-black uppercase tracking-widest">{isMe ? 'Local' : 'Soporte Admin'}</p>
                                        <span className="text-[8px]">•</span>
                                        <p className="text-[8px] font-black">{format(new Date(m.created_at), 'HH:mm')}</p>
                                    </div>
                                    <p className="text-sm font-medium leading-normal">{m.message}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {activeTicket.status === 'open' && (
                    <div className="p-8 bg-white border-t border-gray-50">
                        <form onSubmit={handleSendMessage} className="flex gap-4">
                            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribe tu respuesta..."
                                className="flex-1 bg-gray-50 border-none rounded-[24px] px-8 py-5 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner" />
                            <button type="submit" disabled={!newMessage.trim() || sending}
                                className="bg-primary text-white p-5 rounded-[24px] shadow-brand hover:scale-110 active:scale-95 transition-all disabled:opacity-50">
                                {sending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl"><LifeBuoy className="w-6 h-6 text-primary" /></div>
                        Canal de Asistencia
                    </h2>
                    <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest mt-1">Soporte técnico y reportes operativos</p>
                </div>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-brand hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                        <MessageSquarePlus className="w-4 h-4" /> Nuevo Reporte
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-[40px] p-10 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-lg font-black text-gray-dark uppercase tracking-tighter">Detallar Inconveniente</h3>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-50 rounded-xl"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoría</label>
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner outline-none focus:ring-2 focus:ring-primary/20">
                                    {SYSTEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Descripción</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-[32px] px-8 py-6 font-medium text-sm min-h-[150px] outline-none shadow-inner focus:ring-2 focus:ring-primary/20"
                                    placeholder="Describe el problema para que el administrador pueda ayudarte..." />
                            </div>
                            <button type="submit" disabled={submitting} className="w-full bg-primary text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-brand hover:scale-[1.02] active:scale-[0.98] transition-all">
                                {submitting ? 'Procesando...' : 'Emitir Reporte'}
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-4">
                {tickets.map((t, i) => {
                    const hasUnread = unreadTicketIds.has(t.id);
                    return (
                        <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            onClick={() => { setActiveTicket(t); setUnreadTicketIds(prev => { const s = new Set(prev); s.delete(t.id); return s; }); }}
                            className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-50 group hover:border-primary/20 cursor-pointer transition-all flex items-center justify-between">

                            <div className="flex items-center gap-6">
                                <div className={`p-4 rounded-[24px] ${t.status === 'open' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                                    {t.status === 'open' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-sm font-black text-gray-dark uppercase tracking-tight">{t.category}</h3>
                                        {hasUnread && <span className="bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse">NUEVO</span>}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-medium uppercase tracking-widest">
                                        {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: es })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <p className="text-xs font-medium text-gray-medium hidden md:block max-w-[200px] truncate">{t.description}</p>
                                <div className="p-3 bg-gray-50 group-hover:bg-primary/10 group-hover:text-primary rounded-xl transition-all">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {tickets.length === 0 && !showForm && (
                    <div className="py-20 flex flex-col items-center opacity-20">
                        <Inbox className="w-12 h-12 mb-4" />
                        <p className="font-black text-xs uppercase tracking-[0.3em]">Bandeja vacía</p>
                    </div>
                )}
            </div>
        </div>
    );
}
