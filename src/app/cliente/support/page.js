'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, LifeBuoy, AlertCircle, CheckCircle2, Clock, X, ChevronRight, Send, ArrowLeft, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const CLIENT_CATEGORIES = [
    'Problema con mi orden',
    'Error en el cobro / facturación',
    'No recibí mis puntos',
    'Consulta general',
    'Sugerencia o feedback',
    'Otro'
];

const supabase = createClient();

export default function SupportPage() {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ category: CLIENT_CATEGORIES[0], description: '' });

    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTickets = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await supabase.from('support_tickets').select('*').eq('creator_id', user.id).order('created_at', { ascending: false });
        setTickets(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchTickets();
    }, [user?.id]);

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
        const sub = supabase.channel(`ticket_msg_${activeTicket.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${activeTicket.id}` }, fetchMessages).subscribe();
        return () => supabase.removeChannel(sub);
    }, [activeTicket]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.description.trim()) return showToast('Escribí una descripción', 'error');
        setSubmitting(true);
        try {
            const { error } = await supabase.from('support_tickets').insert({ creator_id: user.id, ticket_type: 'client_general', category: form.category, description: form.description.trim() });
            if (error) throw error;
            showToast('Consulta enviada', 'success');
            setForm({ category: CLIENT_CATEGORIES[0], description: '' });
            setShowForm(false);
            fetchTickets();
        } catch (err) {
            showToast('Error al enviar: ' + err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        setSending(true);
        const { error } = await supabase.from('ticket_messages').insert({ ticket_id: activeTicket.id, sender_id: user.id, message: newMessage.trim() });
        if (!error) setNewMessage('');
        setSending(false);
    };

    const handleResolve = async (ticketId, e) => {
        if (e) e.stopPropagation();
        if (!confirm('¿Marcar como resuelta?')) return;
        try {
            const { error } = await supabase.from('support_tickets').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', ticketId);
            if (error) throw error;
            showToast('Consulta resuelta', 'success');
            fetchTickets();
            if (activeTicket?.id === ticketId) setActiveTicket({ ...activeTicket, status: 'resolved' });
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'open': return { color: 'bg-primary/10 text-primary', icon: AlertCircle, label: 'Abierto' };
            case 'resolved': return { color: 'bg-success/10 text-success', icon: CheckCircle2, label: 'Resuelto' };
            default: return { color: 'bg-gray-100 text-gray-medium', icon: Clock, label: status };
        }
    };

    if (activeTicket) {
        return (
            <div className="h-[calc(100vh-180px)] p-4 flex flex-col max-w-2xl mx-auto">
                <div className="bg-white rounded-t-3xl border-b border-gray-100 p-5 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveTicket(null)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-medium transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                        <div>
                            <h2 className="font-bold text-gray-dark">{activeTicket.category}</h2>
                            <p className="text-[10px] text-gray-medium font-bold uppercase tracking-wider">{format(new Date(activeTicket.created_at), "d MMM yyyy", { locale: es })}</p>
                        </div>
                    </div>
                    {activeTicket.status === 'open' && (
                        <button onClick={(e) => handleResolve(activeTicket.id, e)} className="px-4 py-2 bg-success text-white font-bold rounded-xl text-xs shadow-brand transition">Listo</button>
                    )}
                </div>

                <div className="flex-1 bg-gray-50 overflow-y-auto p-4 space-y-4 shadow-inner">
                    <div className="flex gap-3 max-w-xs ml-auto flex-row-reverse">
                        <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm w-full rounded-tr-none">
                            <p className="text-xs font-bold text-gray-dark mb-1">Tu consulta original:</p>
                            <p className="text-sm text-gray-medium">{activeTicket.description}</p>
                        </div>
                    </div>
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.sender_id === user?.id ? 'ml-auto flex-row-reverse' : ''}`}>
                            <div className={`p-4 rounded-3xl shadow-sm border ${msg.sender_id === user?.id ? 'bg-primary text-white border-primary rounded-tr-none' : 'bg-white text-gray-dark border-gray-100 rounded-tl-none'}`}>
                                <p className="text-sm">{msg.message}</p>
                                <p className={`text-[9px] mt-2 font-bold uppercase opacity-60 ${msg.sender_id === user?.id ? 'text-right' : 'text-left'}`}>{format(new Date(msg.created_at), "HH:mm")}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {activeTicket.status === 'open' ? (
                    <div className="bg-white rounded-b-3xl border-t border-gray-100 p-4 shadow-lg">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribí un mensaje..." className="flex-1 bg-gray-50 border border-transparent rounded-2xl px-5 py-3 outline-none focus:bg-white focus:border-primary/20 transition-all text-sm" />
                            <button disabled={!newMessage.trim() || sending} className="bg-primary text-white rounded-2xl px-6 font-bold hover:bg-primary/90 transition shadow-brand"><Send className="w-5 h-5" /></button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-gray-100 rounded-b-3xl p-4 text-center text-gray-500 text-xs font-bold uppercase tracking-widest italic">Consulta finalizada y resuelta</div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 max-w-2xl mx-auto pb-24">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-dark flex items-center gap-2 tracking-tighter"><LifeBuoy className="w-8 h-8 text-primary" /> Soporte</h1>
                    <p className="text-gray-medium text-sm font-medium">Estamos para ayudarte con cualquier duda.</p>
                </div>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className="bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition shadow-brand">
                        <MessageSquarePlus className="w-5 h-5" /> Nueva Consulta
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-8">
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-dark text-lg">Nueva consulta</h3>
                                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-medium" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-medium uppercase tracking-widest mb-2 block">Seleccioná un motivo</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition text-sm">
                                        {CLIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-medium uppercase tracking-widest mb-2 block">Detallanos el problema</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="¿En qué podemos ayudarte?" rows="4" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition resize-none text-sm" />
                                </div>
                                <button type="submit" disabled={submitting || !form.description.trim()} className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-brand disabled:opacity-50 text-lg">Enviar Consulta</button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                {tickets.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <LifeBuoy className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                        <p className="text-gray-medium font-bold">No tenés consultas activas</p>
                    </div>
                ) : (
                    tickets.map(ticket => {
                        const status = getStatusConfig(ticket.status);
                        const StatusIcon = status.icon;
                        return (
                            <motion.div key={ticket.id} onClick={() => setActiveTicket(ticket)} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 hover:shadow-lg hover:border-primary/10 transition-all cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${status.color}`}>
                                        <StatusIcon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-dark truncate group-hover:text-primary transition-colors">{ticket.category}</h3>
                                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter shrink-0">{formatDistanceToNow(new Date(ticket.created_at), { locale: es, addSuffix: true })}</span>
                                        </div>
                                        <p className="text-xs text-gray-medium line-clamp-1 italic">"{ticket.description}"</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-primary transition-colors" />
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
