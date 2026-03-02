'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Search, Award, TrendingUp, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = createClient();

export default function LocalClientsPage() {
    const { profile } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
            if (!profile?.location_id) return;
            const { data } = await supabase.from('print_orders')
                .select('customer_id, profiles!print_orders_customer_id_fkey(full_name, email, avatar_url, points_accounts(current_points, tier_level))')
                .eq('location_id', profile.location_id);

            const unique = [...new Map((data || []).map(d => [d.customer_id, d.profiles])).entries()]
                .map(([id, p]) => ({ id, ...p }));

            setClients(unique);
            setLoading(false);
        };
        fetchClients();
    }, [profile?.location_id]);

    const filtered = clients.filter(c =>
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="p-8"><div className="shimmer h-[60vh] rounded-[40px]" /></div>;

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl"><Users className="w-6 h-6 text-primary" /></div>
                    Comunidad de Clientes
                </h2>
                <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest mt-1">Base de datos de fidelización del punto</p>
            </div>

            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar por nombre o email..."
                    className="w-full bg-white border-2 border-gray-100 rounded-[32px] pl-14 pr-8 py-5 font-bold text-sm shadow-xl focus:border-primary/20 outline-none transition-all placeholder:text-gray-200" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Rango</th>
                                <th className="px-6 py-4 text-right">Crédito</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((c, i) => (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={c.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.full_name || 'C')}&background=00AEEF&color=fff&bold=true`}
                                                className="w-10 h-10 rounded-full object-cover"
                                                alt=""
                                            />
                                            <span className="font-bold text-gray-900 text-sm">{c.full_name || 'Anónimo'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {c.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${c.points_accounts?.tier_level === 'gold' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                c.points_accounts?.tier_level === 'silver' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                                                    'bg-orange-50 text-orange-700 border-orange-200'
                                            }`}>
                                            {c.points_accounts?.tier_level || 'Bronce'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className="text-sm font-black text-gray-900">
                                            {c.points_accounts?.current_points || 0} pts
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filtered.length === 0 && (
                    <div className="py-12 flex flex-col items-center opacity-50">
                        <Users className="w-12 h-12 mb-4 text-gray-400" />
                        <p className="font-bold text-sm text-gray-500">Sin coincidencias</p>
                    </div>
                )}
            </div>
        </div>
    );
}
