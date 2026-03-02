'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Lock, Gift } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import confetti from 'canvas-confetti';

const supabase = createClient();

export default function RewardsPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [rewards, setRewards] = useState([]);
    const [userPoints, setUserPoints] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        const fetchData = async () => {
            const [rewardsRes, pointsRes] = await Promise.all([
                supabase.from('rewards_catalog').select('*').eq('active', true).order('points_required'),
                supabase.from('points_accounts').select('current_points').eq('user_id', user.id).maybeSingle()
            ]);
            setRewards(rewardsRes.data || []);
            setUserPoints(pointsRes.data?.current_points || 0);
            setLoading(false);
        };
        fetchData();
    }, [user?.id]);

    const categories = ['all', ...new Set(rewards.map(r => r.category).filter(Boolean))];
    const filtered = selectedCategory === 'all' ? rewards : rewards.filter(r => r.category === selectedCategory);

    const handleRedeem = async (reward) => {
        if (userPoints < reward.points_required) return;
        if (!confirm(`¿Canjear "${reward.name}" por ${reward.points_required} puntos?`)) return;
        try {
            const { data, error } = await supabase.functions.invoke('redeem-reward', {
                body: { reward_id: reward.id }
            });

            if (error) throw error;

            confetti({ particleCount: 100, spread: 70, colors: ['#EB1C24', '#FFC905', '#A4CC39', '#0093D8'] });
            showToast(`¡Canje exitoso! Código: ${data.redemption_code}`, 'success');
            setUserPoints(data.points_remaining);
        } catch (err) {
            showToast('Error al canjear: ' + err.message, 'error');
        }
    };

    if (loading) return <div className="p-6 grid grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="shimmer h-56 rounded-xl" />)}</div>;

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-dark">Premios</h2>
                <div className="flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 text-accent fill-current" />
                    <span className="text-lg font-bold text-gray-dark">{userPoints} pts</span>
                </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
                {categories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-white text-gray-medium border border-gray-200 hover:border-primary'}`}>
                        {cat === 'all' ? 'Todos' : cat}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {filtered.map(reward => {
                    const canAfford = userPoints >= reward.points_required;
                    return (
                        <motion.div key={reward.id} className={`bg-white rounded-xl shadow-lg overflow-hidden ${!canAfford ? 'opacity-60' : ''}`}
                            whileHover={canAfford ? { scale: 1.03 } : {}}>
                            <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                {reward.image_url ? <img src={reward.image_url} alt={reward.name} className="w-full h-full object-cover" /> : <Gift className="w-10 h-10 text-gray-medium" />}
                                {!canAfford && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Lock className="w-8 h-8 text-white" /></div>}
                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-medium text-gray-dark">{reward.category}</div>
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold text-gray-dark text-sm mb-1 line-clamp-2">{reward.name}</h3>
                                <p className="text-[10px] text-gray-medium mb-2 line-clamp-2">{reward.description}</p>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1"><Star className="w-4 h-4 text-accent fill-current" /><span className="font-bold text-sm">{reward.points_required}</span></div>
                                    {reward.stock_quantity < 10 && <span className="text-[10px] text-accent font-medium">¡Solo {reward.stock_quantity}!</span>}
                                </div>
                                <button onClick={() => handleRedeem(reward)} disabled={!canAfford}
                                    className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${canAfford ? 'bg-success text-white hover:bg-success/90' : 'bg-gray-100 text-gray-medium cursor-not-allowed'}`}>
                                    {canAfford ? 'Canjear' : `Faltan ${reward.points_required - userPoints} pts`}
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
