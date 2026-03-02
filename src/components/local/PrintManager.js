'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCw, Printer, ChevronLeft, ChevronRight, Maximize2, User, FileText, Image, File, CheckCircle, CheckCircle2, AlertCircle, Send, Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ISSUES_CATEGORIES = [
    'Archivo dañado o ilegible',
    'Formato incorrecto / No soportado',
    'Falta de pago / Comprobante inválido',
    'Calidad de imagen muy baja para imprimir',
    'Otro problema'
];

const STATUS_LABELS = {
    pendiente: { label: 'Pendiente', color: 'bg-amber-400 text-gray-dark' },
    en_proceso: { label: 'Taller', color: 'bg-primary text-white' },
    listo: { label: 'Listo', color: 'bg-success text-white' },
    entregado: { label: 'Archivo', color: 'bg-gray-dark text-white' },
};

const formatSize = (s) => ({ a4: 'A4', a3: 'A3', oficio: 'Oficio (Legal)', '10x15': '10x15 cm', '13x18': '13x18 cm', foto_a4: 'A4 (Foto)' }[s] || s);

const getFileType = (url) => {
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'other';
};

const getFileName = (url) => {
    try { return decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'archivo'); }
    catch { return url.split('/').pop()?.split('?')[0] || 'archivo'; }
};

export function PrintManager({ order, onClose, onStatusChange }) {
    const supabase = createClient();
    const { showToast } = useToast();
    const files = order?.file_urls || [];
    const [activeIndex, setActiveIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [resolvedUrls, setResolvedUrls] = useState({});
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [markingListo, setMarkingListo] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);

    const activeFile = files[activeIndex];
    const fileType = activeFile ? getFileType(activeFile) : 'other';
    const sl = STATUS_LABELS[order?.status] || STATUS_LABELS.pendiente;

    const isReprint = order?.status === 'listo' || !!order?._reprintMode;
    const isPrintingState = order?.status === 'en_proceso' && !order?._reprintMode;

    useEffect(() => {
        const downloadFiles = async () => {
            setLoadingFiles(true);
            const urls = {};
            for (const fileUrl of files) {
                if (fileUrl.startsWith('http')) {
                    urls[fileUrl] = fileUrl;
                } else {
                    try {
                        const { data, error } = await supabase.storage.from('print-files').download(fileUrl);
                        if (error) throw error;
                        urls[fileUrl] = URL.createObjectURL(data);
                    } catch (err) {
                        console.error('Download error:', fileUrl, err);
                    }
                }
            }
            setResolvedUrls(urls);
            setLoadingFiles(false);
        };
        if (files.length > 0) downloadFiles();
        return () => {
            Object.values(resolvedUrls).forEach(url => {
                if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, []);

    const getUrl = (file) => resolvedUrls[file] || '';

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'ArrowLeft') setActiveIndex(i => Math.max(0, i - 1));
            else if (e.key === 'ArrowRight') setActiveIndex(i => Math.min(files.length - 1, i + 1));
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [files.length, onClose]);

    useEffect(() => { setZoom(1); setRotation(0); }, [activeIndex]);

    const handlePrint = () => {
        const url = getUrl(activeFile);
        if (!url) return;

        if (fileType === 'pdf') {
            window.open(url, '_blank')?.print();
        } else if (fileType === 'image') {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(`<html><head><style>@page{margin:10mm}body{margin:0;display:flex;justify-content:center;align-items:center}img{max-width:100%}</style></head><body><img src="${url}" onload="window.print();window.close();" /></body></html>`);
            doc.close();
            setTimeout(() => document.body.removeChild(iframe), 10000);
        }
        showToast('Enviado a impresora', 'info');
    };

    const handleMarkListo = async () => {
        if (markingListo) return;
        setMarkingListo(true);
        try {
            const { error } = await supabase.from('print_orders').update({ status: 'listo' }).eq('id', order.id);
            if (error) throw error;
            showToast('Orden Lista ✓', 'success');
            onStatusChange?.(order.id, 'listo');
        } catch (err) {
            showToast('Error de red', 'error');
            setMarkingListo(false);
        }
    };

    return (
        <motion.div className="fixed inset-0 bg-gray-dark/95 backdrop-blur-xl z-[100] flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white/5 border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/60 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                    <div>
                        <h2 className="text-white font-black tracking-tighter uppercase text-sm">Panel de Impresión <span className="text-primary ml-2">#{order.order_number}</span></h2>
                        <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">{order.profiles?.full_name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isPrintingState && (
                        <>
                            <button onClick={() => setShowIssueModal(true)} className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Problema
                            </button>
                            <button onClick={handleMarkListo} disabled={markingListo} className="px-6 py-3 bg-success text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-brand hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                {markingListo ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Finalizar
                            </button>
                        </>
                    )}
                    {(isPrintingState || isReprint) && (
                        <button onClick={handlePrint} className="px-8 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-brand hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                            <Printer className="w-4 h-4" /> Imprimir
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-24 bg-white/5 border-r border-white/5 p-4 space-y-4 overflow-y-auto no-scrollbar">
                    {files.map((file, i) => {
                        const type = getFileType(file);
                        const active = i === activeIndex;
                        return (
                            <button key={i} onClick={() => setActiveIndex(i)} className={`w-full aspect-square rounded-2xl overflow-hidden border-4 transition-all ${active ? 'border-primary shadow-brand' : 'border-white/5 opacity-40 hover:opacity-100'}`}>
                                {type === 'image' ? <img src={getUrl(file)} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-red-500/20 flex items-center justify-center p-2"><FileText className="w-full h-full text-red-400" /></div>}
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 relative flex items-center justify-center p-10 select-none">
                    {loadingFiles ? (
                        <div className="flex flex-col items-center gap-4">
                            <Loader className="w-10 h-10 text-primary animate-spin" />
                            <p className="text-white/20 font-black text-[10px] uppercase tracking-widest">Descifrando activos...</p>
                        </div>
                    ) : (
                        <motion.div drag dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }} className="cursor-grab active:cursor-grabbing w-full h-full flex items-center justify-center">
                            {fileType === 'pdf' ? <iframe src={getUrl(activeFile)} className="w-full h-full rounded-2xl bg-white shadow-2xl" /> : <img src={getUrl(activeFile)} className="max-w-full max-h-full rounded-lg shadow-2xl transition-transform" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }} />}
                        </motion.div>
                    )}
                </div>

                <div className="w-80 bg-white/5 border-l border-white/5 p-8 flex flex-col gap-10 overflow-y-auto">
                    <div>
                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Parámetros Taller</h4>
                        <div className="space-y-4">
                            <SpecItem label="Papel" value={formatSize(order.specifications?.size)} />
                            <SpecItem label="Copias" value={order.specifications?.copies} />
                            <SpecItem label="Croma" value={order.specifications?.color ? 'Full Color' : 'B&N'} color={order.specifications?.color ? 'text-amber-400' : 'text-white'} />
                        </div>
                    </div>

                    {order.notes && (
                        <div>
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Nota de Cliente</h4>
                            <div className="bg-amber-400/10 border border-amber-400/20 p-4 rounded-2xl">
                                <p className="text-xs font-bold text-amber-200 leading-relaxed">"{order.notes}"</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-auto">
                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Controles</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <ControlBtn icon={<ZoomIn />} onClick={() => setZoom(z => Math.min(3, z + 0.25))} />
                            <ControlBtn icon={<ZoomOut />} onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} />
                            <ControlBtn icon={<RotateCw />} onClick={() => setRotation(r => r + 90)} />
                            <ControlBtn icon={<Maximize2 />} onClick={() => { setZoom(1); setRotation(0); }} />
                        </div>
                    </div>
                </div>
            </div>

            {showIssueModal && (
                <IssueChatModal order={order} onClose={() => setShowIssueModal(false)} onStatusChange={onStatusChange} />
            )}
        </motion.div>
    );
}

function SpecItem({ label, value, color = "text-white" }) {
    return (
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{label}</span>
            <span className={`text-[11px] font-black uppercase ${color}`}>{value || '—'}</span>
        </div>
    );
}

function ControlBtn({ icon, onClick }) {
    return (
        <button onClick={onClick} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all flex items-center justify-center">
            {icon}
        </button>
    );
}

function IssueChatModal({ order, onClose, onStatusChange }) {
    const supabase = createClient();
    const { profile } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [ticket, setTicket] = useState(null);
    const [category, setCategory] = useState(ISSUES_CATEGORIES[0]);
    const [notes, setNotes] = useState('');
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const fetchTicket = async () => {
            const { data } = await supabase.from('support_tickets').select('*').eq('order_id', order.id).in('status', ['open', 'resolved']).maybeSingle();
            if (data) setTicket(data);
            setLoading(false);
        };
        fetchTicket();
    }, [order.id, supabase]);

    useEffect(() => {
        if (!ticket) return;
        const fetchMessages = async () => {
            const { data } = await supabase.from('ticket_messages').select('*, sender:profiles(full_name)').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
            if (data) setMessages(data);
        };
        fetchMessages();
        const chan = supabase.channel(`ticket_${ticket.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticket.id}` }, fetchMessages).subscribe();
        return () => supabase.removeChannel(chan);
    }, [ticket, supabase]);

    const handleCreate = async () => {
        setSending(true);
        try {
            const { data: nt, error } = await supabase.from('support_tickets').insert({ location_id: profile.location_id, order_id: order.id, creator_id: profile.id, ticket_type: 'order_issue', category, description: notes || 'Requiere revisión', status: 'open' }).select().single();
            if (error) throw error;
            await supabase.from('print_orders').update({ status: 'paused' }).eq('id', order.id);
            setTicket(nt);
            onStatusChange?.(order.id, 'paused');
            showToast('Orden Pausada', 'info');
        } catch (err) {
            showToast('Error al procesar', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMsg.trim() || sending) return;
        setSending(true);
        try {
            const { error } = await supabase.from('ticket_messages').insert({ ticket_id: ticket.id, sender_id: profile.id, message: newMsg.trim() });
            if (!error) setNewMsg('');
        } finally {
            setSending(false);
        }
    };

    const handleResolve = async () => {
        try {
            await supabase.from('support_tickets').update({ status: 'resolved' }).eq('id', ticket.id);
            await supabase.from('print_orders').update({ status: 'en_proceso' }).eq('id', order.id);
            onStatusChange?.(order.id, 'en_proceso');
            onClose();
        } catch (err) { }
    };

    if (loading) return null;

    return (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-gray-dark/40 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-dark font-black tracking-tighter uppercase">Gestión de Incidencias</h3>
                        <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mt-1">Chat directo con cliente</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all"><X className="w-5 h-5" /></button>
                </div>

                {!ticket ? (
                    <div className="p-10 space-y-8 flex-1 overflow-y-auto">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría del Problema</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm">
                                {ISSUES_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Explicación para el Cliente</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-gray-50 border-none rounded-[32px] px-6 py-6 font-medium text-sm min-h-[150px] outline-none" placeholder="Explica detalladamente por qué el pedido fue pausado..." />
                        </div>
                        <button onClick={handleCreate} disabled={sending} className="w-full bg-primary text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-brand hover:scale-[1.02] active:scale-[0.98] transition-all">
                            {sending ? 'Notificando...' : 'Pausar y Notificar'}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-gray-50/50">
                            <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm mb-10">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Descripción Inicial</p>
                                <p className="text-sm font-medium text-gray-dark leading-relaxed">{ticket.description}</p>
                            </div>
                            {messages.map(m => {
                                const isMe = m.sender_id === profile.id;
                                return (
                                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-[24px] px-6 py-4 shadow-sm ${isMe ? 'bg-gray-dark text-white rounded-tr-none' : 'bg-white text-gray-dark rounded-tl-none border border-gray-100'}`}>
                                            <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">{isMe ? 'Nosotros' : m.sender?.full_name}</p>
                                            <p className="text-sm font-medium leading-normal">{m.message}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-8 bg-white border-t border-gray-100">
                            {ticket.status === 'open' ? (
                                <form onSubmit={handleSend} className="flex gap-4">
                                    <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                    <button type="submit" className="bg-primary text-white p-4 rounded-2xl shadow-brand hover:scale-105 active:scale-95 transition-all"><Send className="w-5 h-5" /></button>
                                    <button type="button" onClick={handleResolve} className="bg-success text-white px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-brand hover:scale-105 active:scale-95 transition-all flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Resolver</button>
                                </form>
                            ) : (
                                <div className="text-center py-2 text-[10px] font-black text-success uppercase tracking-widest">Inconveniente Resuelto ✓</div>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}
