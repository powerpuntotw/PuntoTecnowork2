'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, TrendingUp, TrendingDown, Gift, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_CONFIG = {
    earn: { label: 'Ganados', icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', sign: '+' },
    redeem: { label: 'Canjeados', icon: Gift, color: 'text-primary', bg: 'bg-primary/10', sign: '-' },
    adjustment: { label: 'Ajuste', icon: Zap, color: 'text-secondary', bg: 'bg-secondary/10', sign: '' },
    bonus: { label: 'Bonus', icon: Star, color: 'text-accent', bg: 'bg-accent/10', sign: '+' },
};

const supabase = createClient();

export default function PointsHistoryPage() {
    const { user } = useAuth();

    const [transactions, setTransactions] = useState([]);
    const [balance, setBalance] = useState({ current: 0, lifetime: 0, tier: 'bronze' });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!user?.id) return;
        const fetchData = async () => {
            const [txRes, pointsRes] = await Promise.all([
                supabase.from('points_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('points_accounts').select('current_points, lifetime_points, tier_level').eq('user_id', user.id).maybeSingle()
            ]);
            setTransactions(txRes.data || []);
            if (pointsRes.data) {
                setBalance({
                    current: pointsRes.data.current_points,
                    lifetime: pointsRes.data.lifetime_points,
                    tier: pointsRes.data.tier_level
                });
            }
            setLoading(false);
        };
        fetchData();
    }, [user?.id]);

    const filtered = filter === 'all' ? transactions : transactions.filter(t => t.transaction_type === filter);
    const TIER_EMOJI = { bronze: '🥉', silver: '🥈', gold: '🥇', diamond: '💎' };

    if (loading) return <div className="p-6 space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="shimmer h-16 rounded-xl" />)}</div>;

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <motion.div className="bg-gradient-to-br from-secondary to-cyan-400 rounded-3xl p-8 text-white mb-8 shadow-xl relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Star className="w-32 h-32 fill-current" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold opacity-80 uppercase tracking-widest">Mi Balance</span>
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase">
                            {TIER_EMOJI[balance.tier]} {balance.tier}
                        </span>
                    </div>
                    <p className="text-5xl font-black mb-1">{balance.current.toLocaleString()} pts</p>
                    <p className="text-xs font-medium opacity-70">Total acumulado histórico: {balance.lifetime.toLocaleString()}</p>
                </div>
            </motion.div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
                {['all', ...Object.keys(TYPE_CONFIG)].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all ${filter === f ? 'bg-secondary text-white shadow-brand' : 'bg-white text-gray-medium border border-gray-200 hover:border-secondary/50'}`}>
                        {f === 'all' ? 'Historial Completo' : TYPE_CONFIG[f].label}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                    <Star className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-medium font-medium">No se registran movimientos</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((tx, i) => {
                        const config = TYPE_CONFIG[tx.transaction_type] || TYPE_CONFIG.adjustment;
                        const Icon = config.icon;
                        return (
                            <motion.div key={tx.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-50 shadow-sm"
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}>
                                    <Icon className={`w-6 h-6 ${config.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-dark truncate">{tx.description || config.label}</p>
                                    <p className="text-[10px] text-gray-medium font-medium uppercase tracking-wider">{format(new Date(tx.created_at), "d 'de' MMM, HH:mm", { locale: es })}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`font-black text-sm ${config.color}`}>
                                        {config.sign}{Math.abs(tx.points_amount)}
                                    </span>
                                    <span className="text-[10px] block font-bold text-gray-300 uppercase">pts</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
