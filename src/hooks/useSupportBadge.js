'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSupportBadge = () => {
    const { user, profile } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const supabase = createClient();

    useEffect(() => {
        if (!user?.id) return;

        const fetchUnread = async () => {
            let ticketQuery = supabase
                .from('support_tickets')
                .select('id')
                .eq('status', 'open');

            if (profile?.user_type === 'admin') {
                // Admin sees all
            } else if (profile?.user_type === 'local') {
                ticketQuery = ticketQuery.eq('location_id', profile.location_id);
            } else {
                ticketQuery = ticketQuery.eq('creator_id', user.id);
            }

            const { data: tickets } = await ticketQuery;
            if (!tickets || tickets.length === 0) {
                setUnreadCount(0);
                return;
            }

            const ticketIds = tickets.map(t => t.id);

            const { count, error } = await supabase
                .from('ticket_messages')
                .select('id', { count: 'exact', head: true })
                .in('ticket_id', ticketIds)
                .neq('sender_id', user.id);

            if (!error) {
                setUnreadCount(count || 0);
            }
        };

        fetchUnread();

        const channel = supabase
            .channel('support-badge-' + user.id)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'ticket_messages'
            }, (payload) => {
                if (payload.new.sender_id !== user.id) {
                    setUnreadCount(prev => prev + 1);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.id, profile?.user_type, profile?.location_id, supabase]);

    const resetCount = () => setUnreadCount(0);

    return { unreadCount, resetCount };
};
