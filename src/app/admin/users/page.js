'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Trash2, Shield, User, ChevronLeft, ChevronRight, Mail, Star, Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_COLORS = {
    admin: 'bg-primary text-white',
    local: 'bg-secondary text-white',
    client: 'bg-success text-white'
};

const supabase = createClient();

export default function AdminUsersPage() {
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 20;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('*, points_accounts(current_points, tier_level)', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (roleFilter) query = query.eq('user_type', roleFilter);
            if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

            query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            const { data, count } = await query;
            setUsers(data || []);
            setTotalCount(count || 0);
        } catch (err) {
            console.error('Users fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setPage(0); }, [search, roleFilter]);
    useEffect(() => { fetchUsers(); }, [page, search, roleFilter]);

    const updateRole = async (userObj, newRole) => {
        if (!confirm(`¿Cambiar el rol de ${userObj.full_name || userObj.email} a ${newRole}?`)) return;
        try {
            const { error } = await supabase.from('profiles').update({ user_type: newRole }).eq('id', userObj.id);
            if (error) throw error;

            await supabase.from('admin_audit_logs').insert({
                admin_id: currentUser.id,
                action: 'update_role',
                target_id: userObj.id,
                target_type: 'user',
                details: { description: `Rol de ${userObj.full_name || userObj.email} cambiado a ${newRole}` }
            });

            showToast(`Rol actualizado a ${newRole}`, 'success');
            fetchUsers();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    const deleteUser = async (userObj) => {
        if (!confirm(`¿Eliminar al usuario ${userObj.full_name || userObj.email}? Se borrarán todos sus datos permanentemente.`)) return;
        try {
            const { error } = await supabase.functions.invoke('delete-user', {
                body: { user_id: userObj.id }
            });
            if (error) throw error;

            showToast('Usuario eliminado completamente', 'success');
            await supabase.from('admin_audit_logs').insert({
                admin_id: currentUser.id,
                action: 'delete_user',
                target_id: userObj.id,
                target_type: 'user',
                details: { description: `Usuario ${userObj.full_name || userObj.email} eliminado completamente` }
            });
            fetchUsers();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase">Usuarios del Sistema</h2>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-black text-gray-medium uppercase tracking-widest">Total Usuarios:</span>
                    <span className="text-sm font-black text-primary">{totalCount}</span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o email..."
                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm"
                    />
                </div>
                <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        className="pl-12 pr-10 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm appearance-none font-bold text-sm min-w-[200px]"
                    >
                        <option value="">Filtrar por Rol</option>
                        <option value="admin">Administrador</option>
                        <option value="local">Local de Impresión</option>
                        <option value="client">Cliente Final</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center space-y-4">
                        <Loader className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-xs font-black text-gray-medium uppercase tracking-widest">Sincronizando Usuarios...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Identidad</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Rol Asignado</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Puntos</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Nivel Loyalty</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map((u, i) => (
                                    <motion.tr
                                        key={u.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        className="hover:bg-gray-50/80 transition-colors group"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img
                                                        src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || 'U')}&background=EB1C24&color=fff`}
                                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || 'U')}&background=EB1C24&color=fff`; }}
                                                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                                                        alt={u.full_name}
                                                    />
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${ROLE_COLORS[u.user_type].split(' ')[0]}`} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-dark group-hover:text-primary transition-colors">{u.full_name || 'Usuario sin nombre'}</span>
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-medium">
                                                        <Mail className="w-3 h-3" />
                                                        {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={u.user_type}
                                                onChange={e => updateRole(u, e.target.value)}
                                                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border-2 border-transparent focus:border-white/20 outline-none transition-all cursor-pointer shadow-sm ${ROLE_COLORS[u.user_type]}`}
                                            >
                                                <option value="admin">Administrador</option>
                                                <option value="local">Local</option>
                                                <option value="client">Cliente</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 text-accent fill-accent" />
                                                <span className="font-black text-gray-dark text-lg leading-none">{(u.points_accounts?.current_points || 0).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-[10px] font-black uppercase bg-gray-100 text-gray-500 px-3 py-1 rounded-full border border-gray-200">
                                                {u.points_accounts?.tier_level || 'bronze'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => deleteUser(u)}
                                                className="p-2 text-gray-200 hover:text-primary hover:bg-white hover:shadow-md rounded-xl transition-all"
                                                title="Eliminar permanentemente"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {users.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <User className="w-20 h-20 text-gray-50 mb-4" />
                        <p className="text-gray-medium font-black uppercase tracking-widest text-xs">No se encontraron usuarios que coincidan</p>
                    </div>
                )}

                {totalCount > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-8 py-6 border-t border-gray-50 bg-gray-50/30">
                        <span className="text-[10px] font-black text-gray-medium uppercase tracking-widest">
                            Mostrando {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
                        </span>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-tighter disabled:opacity-30 flex items-center gap-2 hover:shadow-md transition-all shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" /> Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={(page + 1) * PAGE_SIZE >= totalCount}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-tighter disabled:opacity-30 flex items-center gap-2 hover:shadow-md transition-all shadow-sm"
                            >
                                Siguiente <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
