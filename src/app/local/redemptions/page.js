'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { Search, CheckCircle, Package, Gift, Loader, Hash, User, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const supabase = createClient();

export default function LocalRedemptionsPage() {
    const { profile } = useAuth();
    const { showToast } = useToast();

    const [searchCode, setSearchCode] = useState('');
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(null);

    useEffect(() => {
        const fetchRedemptions = async () => {
            if (!profile?.location_id) return;
            const { data } = await supabase.from('reward_redemptions')
                .select('*, profiles!reward_redemptions_user_id_fkey(full_name, email), rewards_catalog!reward_redemptions_reward_id_fkey(name, image_url)')
                .eq('location_id', profile.location_id)
                .order('created_at', { ascending: false });
            setRedemptions(data || []);
            setLoading(false);
        };
        fetchRedemptions();
    }, [profile?.location_id]);

    const markAsRetirado = async (redemption) => {
        if (marking) return;
        setMarking(redemption.id);
        try {
            const { error } = await supabase.from('reward_redemptions')
                .update({ status: 'retirado', completed_at: new Date().toISOString() })
                .eq('id', redemption.id);

            if (error) throw error;
            setRedemptions(prev => prev.map(r => r.id === redemption.id ? { ...r, status: 'retirado' } : r));
            showToast('Premio entregado al cliente', 'success');
        } catch (err) {
            showToast('Error de red', 'error');
        } finally {
            setMarking(null);
        }
    };

    const filtered = redemptions.filter(r =>
        r.redemption_code.toLowerCase().includes(searchCode.toLowerCase()) ||
        r.profiles?.full_name?.toLowerCase().includes(searchCode.toLowerCase()) ||
        r.rewards_catalog?.name?.toLowerCase().includes(searchCode.toLowerCase())
    );

    if (loading) return <div className="p-8"><div className="shimmer h-[70vh] rounded-[40px]" /></div>;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl"><Gift className="w-6 h-6 text-primary" /></div>
                        Canjes Pendientes
                    </h2>
                    <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest mt-1">Validación y entrega de recompensas</p>
                </div>
            </div>

            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                <input value={searchCode} onChange={e => setSearchCode(e.target.value)} placeholder="Escanear código o buscar cliente..."
                    className="w-full bg-white border-2 border-gray-100 rounded-[32px] pl-14 pr-8 py-5 font-bold text-sm shadow-xl focus:border-primary/20 outline-none transition-all placeholder:text-gray-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                    {filtered.map((r, i) => (
                        <motion.div key={r.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className={`bg-white rounded-[40px] p-8 shadow-xl border-2 transition-all ${r.status === 'pendiente' ? 'border-primary/5 group hover:border-primary/20' : 'border-gray-50 opacity-60'}`}>

                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-gray-dark rounded-2xl"><Hash className="w-4 h-4 text-white" /></div>
                                    <span className="text-lg font-black text-gray-dark tracking-tighter">{r.redemption_code}</span>
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${r.status === 'pendiente' ? 'bg-primary text-white shadow-brand' : 'bg-success/10 text-success'}`}>
                                    {r.status === 'pendiente' ? 'En Espera' : 'Entregado'}
                                </span>
                            </div>

                            <div className="flex gap-6 mb-8">
                                <img src={r.rewards_catalog?.image_url || 'https://via.placeholder.com/100'} className="w-20 h-20 rounded-3xl object-cover shadow-lg" alt="" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-gray-dark uppercase tracking-tight leading-none mb-2">{r.rewards_catalog?.name}</h4>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-[10px] text-gray-medium font-bold uppercase tracking-tighter">
                                            <User className="w-3 h-3 text-primary" />
                                            <span>{r.profiles?.full_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-medium font-bold uppercase tracking-tighter">
                                            <Calendar className="w-3 h-3 text-secondary" />
                                            <span>{format(new Date(r.created_at), 'd MMM yyyy, HH:mm', { locale: es })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {r.status === 'pendiente' && (
                                <button onClick={() => markAsRetirado(r)} disabled={marking === r.id}
                                    className="w-full bg-gray-dark text-white py-4 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group-hover:bg-primary group-hover:shadow-brand">
                                    {marking === r.id ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Confirmar Entrega
                                </button>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filtered.length === 0 && (
                <div className="py-40 flex flex-col items-center opacity-20">
                    <Gift className="w-12 h-12 mb-4" />
                    <p className="font-black text-xs uppercase tracking-[0.3em]">Sin movimientos</p>
                </div>
            )}
        </div>
    );
}
