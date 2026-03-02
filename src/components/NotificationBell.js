'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Package, Check, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const NotificationBell = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const supabase = createClient();

    useEffect(() => {
        if (!user) return;
        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);
            setNotifications(data || []);
        };
        fetchNotifications();

        const channel = supabase.channel(`user-notifications-${Date.now()}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                setNotifications(prev => [payload.new, ...prev]);
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id, supabase]);

    useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = async (id) => {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;
        await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = async () => {
        await supabase.from('notifications').delete().eq('user_id', user.id);
        setNotifications([]);
        setOpen(false);
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'ahora';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        return `${Math.floor(hrs / 24)}d`;
    };

    const typeIcon = (type) => {
        if (type === 'order_update') return <Package className="w-4 h-4 text-secondary" />;
        if (type === 'success') return <Check className="w-4 h-4 text-success" />;
        if (type === 'ticket_resolved') return <CheckCircle2 className="w-4 h-4 text-success" />;
        return <Bell className="w-4 h-4 text-accent" />;
    };

    return (
        <div ref={ref} className="relative">
            <button onClick={() => setOpen(!open)} className="relative text-white/80 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-[10px] font-bold text-gray-dark rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-80 max-h-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden">

                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h3 className="font-bold text-gray-dark text-sm">Notificaciones</h3>
                            <div className="flex gap-2">
                                {unreadCount > 0 && (
                                    <button onClick={markAllAsRead} className="text-[10px] text-secondary font-medium hover:underline">
                                        Marcar todo leído
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button onClick={clearAll} className="text-[10px] text-gray-medium hover:text-primary">
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-72">
                            {notifications.length === 0 ? (
                                <div className="text-center py-8 text-gray-medium text-sm">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    Sin notificaciones
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} onClick={() => markAsRead(n.id)}
                                        className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-secondary/5' : ''}`}>
                                        <div className="mt-0.5 p-1.5 rounded-full bg-gray-100">
                                            {typeIcon(n.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs ${!n.read ? 'font-bold text-gray-dark' : 'font-medium text-gray-medium'}`}>{n.title}</p>
                                            <p className="text-[11px] text-gray-medium mt-0.5 line-clamp-2">{n.message}</p>
                                        </div>
                                        <span className="text-[10px] text-gray-medium whitespace-nowrap mt-0.5">{timeAgo(n.created_at)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
