'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, CheckCircle2, MapPin, User, AlertCircle, Send, X, ArrowLeft, MessageSquarePlus, Loader, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const supabase = createClient();

export default function AdminSupportPage() {
    const { profile } = useAuth();
    const { showToast } = useToast();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('open'); // 'open', 'resolved', 'all'
    const [showNewForm, setShowNewForm] = useState(false);
    const [locations, setLocations] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [newForm, setNewForm] = useState({ location_id: '', category: 'Administración', description: '' });

    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchLocs = async () => {
            const { data } = await supabase.from('printing_locations').select('id, name').eq('status', 'activo').order('name');
            if (data) {
                setLocations(data);
                if (data.length > 0) setNewForm(prev => ({ ...prev, location_id: data[0].id }));
            }
        };
        fetchLocs();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('support_tickets')
                .select(`
                    *,
                    location:printing_locations(name, address),
                    creator:profiles(full_name, email)
                `)
                .in('ticket_type', ['system_report', 'order_issue'])
                .order('created_at', { ascending: false });

            if (filter !== 'all') query = query.eq('status', filter);

            const { data, error } = await query;
            if (error) throw error;
            setTickets(data || []);
        } catch (err) {
            showToast('Error al cargar tickets: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [filter]);

    useEffect(() => {
        if (!activeTicket) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('ticket_messages')
                .select('*, sender:profiles(full_name, user_type, avatar_url)')
                .eq('ticket_id', activeTicket.id)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data);
                setTimeout(scrollToBottom, 100);
            }
        };
        fetchMessages();

        const channel = supabase
            .channel(`ticket_${activeTicket.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${activeTicket.id}` }, () => {
                fetchMessages();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [activeTicket]);

    const handleCreateChat = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { data, error } = await supabase.from('support_tickets').insert({
                location_id: newForm.location_id,
                creator_id: profile.id,
                ticket_type: 'system_report',
                category: newForm.category,
                description: newForm.description.trim()
            }).select('*, location:printing_locations(name, address), creator:profiles(full_name, email)').single();

            if (error) throw error;

            showToast('Chat iniciado', 'success');
            setShowNewForm(false);
            setNewForm(prev => ({ ...prev, description: '' }));
            fetchTickets();
            if (data) setActiveTicket(data);
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        setSending(true);
        try {
            const { error } = await supabase.from('ticket_messages').insert({
                ticket_id: activeTicket.id,
                sender_id: profile.id,
                message: newMessage.trim()
            });
            if (error) throw error;
            setNewMessage('');
        } catch (err) {
            showToast('Error al enviar: ' + err.message, 'error');
        } finally {
            setSending(false);
        }
    };

    const handleResolve = async (ticketId, e) => {
        if (e) e.stopPropagation();
        try {
            const { error } = await supabase.from('support_tickets').update({ status: 'resolved', resolved_at: new Date() }).eq('id', ticketId);
            if (error) throw error;
            showToast('Problema resuelto', 'success');
            fetchTickets();
            if (activeTicket?.id === ticketId) setActiveTicket({ ...activeTicket, status: 'resolved' });
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    if (activeTicket) {
        return (
            <div className="h-[calc(100vh-120px)] flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveTicket(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all group">
                            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeTicket.ticket_type === 'system_report' ? 'bg-indigo-50 text-indigo-500' : 'bg-orange-50 text-orange-500'}`}>
                                    {activeTicket.ticket_type === 'system_report' ? 'Auditoría' : 'Orden'}
                                </span>
                                <h2 className="font-black text-gray-dark tracking-tight">{activeTicket.category}</h2>
                            </div>
                            <p className="text-[10px] text-gray-medium font-bold uppercase tracking-tighter mt-0.5">{activeTicket.location?.name || 'Local'} • {activeTicket.creator?.full_name}</p>
                        </div>
                    </div>
                    {activeTicket.status === 'open' ? (
                        <button onClick={(e) => handleResolve(activeTicket.id, e)} className="px-5 py-2.5 bg-success text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-brand hover:scale-105 transition-all">
                            Cerrar Ticket
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-gray-400 font-black text-[10px] uppercase tracking-widest">
                            <CheckCircle2 className="w-4 h-4" /> Resuelto
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/30 no-scrollbar">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                            <AlertCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm max-w-[80%]">
                            <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest mb-3">Requerimiento Inicial</p>
                            <p className="text-gray-dark text-sm leading-relaxed">{activeTicket.description}</p>
                            <p className="text-[9px] text-gray-medium mt-4 font-bold">{format(new Date(activeTicket.created_at), "HH:mm 'hs' - d MMM", { locale: es })}</p>
                        </div>
                    </div>

                    {messages.map(msg => {
                        const isAdmin = msg.sender?.user_type === 'admin';
                        return (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex gap-4 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 border-2 border-white shadow-sm">
                                    <img src={msg.sender?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.full_name || 'U')}&background=${isAdmin ? '000' : 'EB1C24'}&color=fff`} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className={`relative max-w-[70%] p-5 rounded-[24px] shadow-sm border ${isAdmin ? 'bg-gray-dark text-white border-gray-dark text-right' : 'bg-white text-gray-dark border-gray-100'}`}>
                                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-2">{msg.sender?.full_name}</p>
                                    <p className="text-sm leading-relaxed">{msg.message}</p>
                                    <p className={`text-[9px] mt-3 font-bold opacity-30`}>{format(new Date(msg.created_at), "HH:mm", { locale: es })}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {activeTicket.status === 'open' && (
                    <div className="p-6 bg-white border-t border-gray-50 flex gap-4 sticky bottom-0">
                        <form onSubmit={handleSendMessage} className="flex-1 flex gap-3">
                            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribí una respuesta oficial..." className="flex-1 bg-gray-50 px-6 py-4 rounded-2xl font-medium text-sm outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" />
                            <button type="submit" disabled={!newMessage.trim() || sending} className="bg-primary text-white p-4 rounded-2xl shadow-brand hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                                {sending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl"><Inbox className="w-6 h-6 text-primary" /></div>
                        Centro de Soporte
                    </h2>
                    <p className="text-xs text-gray-medium font-bold uppercase tracking-widest mt-1">Gestión integral de reportes y comunicaciones</p>
                </div>
                {!showNewForm ? (
                    <button onClick={() => setShowNewForm(true)} className="bg-gray-dark text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-primary transition-all">
                        <MessageSquarePlus className="w-5 h-5" /> Abrir Nuevo Chat
                    </button>
                ) : (
                    <button onClick={() => setShowNewForm(false)} className="bg-gray-100 text-gray-400 p-3 rounded-2xl hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showNewForm && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-[32px] p-8 shadow-xl border border-gray-100">
                        <h3 className="text-[10px] font-black text-gray-medium uppercase tracking-[0.3em] mb-6">Iniciar comunicación directa</h3>
                        <form onSubmit={handleCreateChat} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 space-y-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-gray-400 mb-2 block">Sucursal Destino</label>
                                    <select value={newForm.location_id} onChange={e => setNewForm({ ...newForm, location_id: e.target.value })} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 font-bold text-sm">
                                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-gray-400 mb-2 block">Asunto</label>
                                    <input value={newForm.category} onChange={e => setNewForm({ ...newForm, category: e.target.value })} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 font-bold text-sm" />
                                </div>
                            </div>
                            <div className="md:col-span-2 flex flex-col">
                                <label className="text-[9px] font-black uppercase text-gray-400 mb-2 block">Cuerpo del mensaje</label>
                                <textarea value={newForm.description} onChange={e => setNewForm({ ...newForm, description: e.target.value })} rows="4" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-medium text-sm resize-none flex-1" placeholder="Describa el motivo del contacto..." />
                                <div className="mt-4 flex justify-end">
                                    <button disabled={submitting || !newForm.description} className="bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-brand">
                                        {submitting ? 'Abriendo canal...' : 'Despachar Mensaje'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-50 w-fit">
                {['open', 'resolved', 'all'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${filter === f ? 'bg-gray-dark text-white shadow-lg' : 'text-gray-400 font-bold hover:text-gray-600'}`}>
                        {f === 'open' ? 'Pendientes' : f === 'resolved' ? 'Histórico' : 'Todos'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(i => <div key={i} className="shimmer h-40 rounded-3xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {tickets.map((t, i) => (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={t.id} onClick={() => setActiveTicket(t)} className="bg-white rounded-[32px] p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden">
                            {t.status === 'open' && <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rotate-45 translate-x-10 -translate-y-10" />}
                            <div className="flex items-center justify-between mb-6">
                                <div className={`p-3 rounded-2xl ${t.status === 'open' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                                    {t.status === 'open' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                                </div>
                                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(t.created_at), { locale: es })}
                                </span>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${t.ticket_type === 'system_report' ? 'bg-indigo-50 text-indigo-400' : 'bg-orange-50 text-orange-400'}`}>
                                        {t.ticket_type === 'system_report' ? 'Sistema' : 'Orden'}
                                    </span>
                                    <h3 className="font-bold text-gray-dark group-hover:text-primary transition-colors flex-1 truncate">{t.category}</h3>
                                </div>
                                <p className="text-xs text-gray-medium line-clamp-2 leading-relaxed h-8">{t.description}</p>
                            </div>

                            <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-gray-dark uppercase tracking-tighter">{t.location?.name || 'Local'}</span>
                                    <span className="text-[9px] text-gray-400 font-bold">{t.creator?.full_name}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-primary transition-colors">
                                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-white rotate-180" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
