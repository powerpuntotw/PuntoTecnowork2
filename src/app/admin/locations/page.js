'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Edit2, Trash2, Save, X, User, Camera, DollarSign, Palette, Printer, Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createClient();

export default function AdminLocationsPage() {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [locations, setLocations] = useState([]);
    const [localUsers, setLocalUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({
        name: '', address: '', phone: '', email: '', status: 'activo', assigned_user_id: '',
        has_fotoya: false, allow_custom_prices: false,
        has_color_printing: false, max_color_size: 'A4', max_bw_size: 'A4'
    });

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('printing_locations').select('*').order('created_at');
            const { data: users } = await supabase.from('profiles').select('id, full_name, email, location_id').eq('user_type', 'local');

            const enrichedLocations = (data || []).map(loc => ({
                ...loc,
                assigned_user: users?.find(u => u.location_id === loc.id)
            }));
            setLocations(enrichedLocations);
            setLocalUsers(users || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.assigned_user_id) return showToast('Debe asignar un usuario Local obligatoriamente', 'error');

        setSubmitting(true);
        try {
            const locData = {
                name: form.name, address: form.address, phone: form.phone, email: form.email, status: form.status,
                has_fotoya: form.has_fotoya, allow_custom_prices: form.allow_custom_prices,
                has_color_printing: form.has_color_printing,
                max_color_size: form.max_color_size,
                max_bw_size: form.max_bw_size
            };
            let currentLocId = editId;

            if (editId) {
                const original = locations.find(l => l.id === editId);
                const changes = [];
                if (original) {
                    if (original.has_fotoya !== form.has_fotoya) changes.push(`FotoYa: ${form.has_fotoya ? 'Activado' : 'Desactivado'}`);
                    if (original.status !== form.status) changes.push(`Estado: ${form.status}`);
                    if (original.name !== form.name) changes.push(`Nombre: ${form.name}`);
                }
                const dText = changes.length > 0 ? `Local actualizado. Cambios: ${changes.join(', ')}` : `Local "${form.name}" actualizado`;

                const { error } = await supabase.from('printing_locations').update(locData).eq('id', editId);
                if (error) throw error;
                await supabase.from('admin_audit_logs').insert({ admin_id: user.id, action: 'update_location', target_id: editId, target_type: 'location', details: { description: dText } });
                showToast('Local actualizado', 'success');
            } else {
                const { data, error } = await supabase.from('printing_locations').insert(locData).select().single();
                if (error) throw error;
                currentLocId = data.id;

                await supabase.from('admin_audit_logs').insert({ admin_id: user.id, action: 'create_location', target_id: currentLocId, target_type: 'location', details: { description: `Local "${form.name}" creado` } });
                showToast('Local creado', 'success');
            }

            // Sync user assignment
            const oldUser = localUsers.find(u => u.location_id === currentLocId);
            if (oldUser && oldUser.id !== form.assigned_user_id) {
                await supabase.from('profiles').update({ location_id: null }).eq('id', oldUser.id);
            }
            if (form.assigned_user_id && (!oldUser || oldUser.id !== form.assigned_user_id)) {
                await supabase.from('profiles').update({ location_id: currentLocId }).eq('id', form.assigned_user_id);
            }

            resetForm();
            fetchLocations();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (loc) => {
        setForm({
            name: loc.name, address: loc.address, phone: loc.phone || '', email: loc.email || '', status: loc.status,
            assigned_user_id: loc.assigned_user?.id || '',
            has_fotoya: loc.has_fotoya || false, allow_custom_prices: loc.allow_custom_prices || false,
            has_color_printing: loc.has_color_printing || false,
            max_color_size: loc.max_color_size || 'A4',
            max_bw_size: loc.max_bw_size || 'A4'
        });
        setEditId(loc.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar permanentemente este local?')) return;
        try {
            const { error } = await supabase.from('printing_locations').delete().eq('id', id);
            if (error) throw error;
            showToast('Local eliminado', 'success');
            fetchLocations();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    const resetForm = () => {
        setForm({ name: '', address: '', phone: '', email: '', status: 'activo', assigned_user_id: '', has_fotoya: false, allow_custom_prices: false, has_color_printing: false, max_color_size: 'A4', max_bw_size: 'A4' });
        setEditId(null);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-xl"><MapPin className="w-6 h-6 text-success" /></div>
                    Gestión de Sucursales
                </h2>
                {!showForm && (
                    <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-brand hover:scale-105 transition-all">
                        <Plus className="w-5 h-5" /> Nueva Sucursal
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, scale: 0.95, height: 0 }} animate={{ opacity: 1, scale: 1, height: 'auto' }} exit={{ opacity: 0, scale: 0.95, height: 0 }} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-black text-gray-dark uppercase tracking-widest text-xs">{editId ? 'Modificar' : 'Alta de'} Sucursal</h3>
                            <button onClick={resetForm} className="p-2 hover:bg-gray-200 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-medium" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-medium uppercase tracking-[0.2em] mb-2 block">Nombre Sucursal</label>
                                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Central Belgrano" className="w-full px-5 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-medium uppercase tracking-[0.2em] mb-2 block">Dirección Física</label>
                                        <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Calle y Nro, Localidad" className="w-full px-5 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-medium uppercase tracking-[0.2em] mb-2 block">Encargado Local</label>
                                        <select value={form.assigned_user_id} onChange={e => setForm({ ...form, assigned_user_id: e.target.value })} className="w-full px-5 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm appearance-none">
                                            <option value="">Seleccionar Local User...</option>
                                            {localUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email} {u.location_id && u.location_id !== editId ? '⚠️' : ''}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                                    <h4 className="text-[10px] font-black text-gray-medium uppercase tracking-[0.2em]">Configuración de Hardware</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 cursor-pointer hover:border-primary/20 transition-all">
                                            <input type="checkbox" checked={form.has_fotoya} onChange={e => setForm({ ...form, has_fotoya: e.target.checked })} className="w-5 h-5 rounded-lg text-primary accent-primary" />
                                            <div className="flex-1">
                                                <p className="text-xs font-black uppercase text-gray-dark flex items-center gap-2"><Camera className="w-4 h-4 text-primary" /> FotoYa</p>
                                                <p className="text-[10px] text-gray-medium">Imprenta rápida de fotos habilitada</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 cursor-pointer hover:border-accent/20 transition-all">
                                            <input type="checkbox" checked={form.allow_custom_prices} onChange={e => setForm({ ...form, allow_custom_prices: e.target.checked })} className="w-5 h-5 rounded-lg text-accent accent-accent" />
                                            <div className="flex-1">
                                                <p className="text-xs font-black uppercase text-gray-dark flex items-center gap-2"><DollarSign className="w-4 h-4 text-accent" /> Custom Pricing</p>
                                                <p className="text-[10px] text-gray-medium">El local puede anular precios globales</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 cursor-pointer hover:border-yellow-400/20 transition-all">
                                            <input type="checkbox" checked={form.has_color_printing} onChange={e => setForm({ ...form, has_color_printing: e.target.checked })} className="w-5 h-5 rounded-lg text-yellow-500 accent-yellow-500" />
                                            <div className="flex-1">
                                                <p className="text-xs font-black uppercase text-gray-dark flex items-center gap-2"><Palette className="w-4 h-4 text-yellow-500" /> Color Printing</p>
                                                <p className="text-[10px] text-gray-medium">Documentos a color habilitado</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                <div className="flex gap-4">
                                    {['A4', 'A3'].map(size => (
                                        <button key={size} type="button" onClick={() => setForm({ ...form, max_bw_size: size })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${form.max_bw_size === size ? 'bg-gray-dark text-white border-gray-dark' : 'bg-white text-gray-medium border-gray-100'}`}>B&N {size}</button>
                                    ))}
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={resetForm} className="px-6 py-3 text-gray-medium font-black text-xs uppercase tracking-widest">Cancelar</button>
                                    <button type="submit" disabled={submitting || !form.name || !form.assigned_user_id} className="bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-brand flex items-center gap-2">
                                        {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Guardar Sucursal
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="shimmer h-48 rounded-3xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {locations.map((loc, i) => (
                        <motion.div key={loc.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-gray-50 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <Printer className="w-6 h-6" />
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${loc.status === 'activo' ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-400'}`}>
                                    {loc.status}
                                </div>
                            </div>

                            <h3 className="text-lg font-black text-gray-dark mb-1 tracking-tight">{loc.name}</h3>
                            <p className="text-xs text-gray-medium mb-6 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {loc.address}</p>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {loc.has_fotoya && <span className="p-2 bg-primary/5 text-primary rounded-xl" title="FotoYa"><Camera className="w-4 h-4" /></span>}
                                {loc.allow_custom_prices && <span className="p-2 bg-accent/5 text-accent rounded-xl" title="Custom Prices"><DollarSign className="w-4 h-4" /></span>}
                                {loc.has_color_printing && <span className="p-2 bg-yellow-50 text-yellow-500 rounded-xl" title="Color"><Palette className="w-4 h-4" /></span>}
                                <span className="p-1 px-3 bg-gray-50 text-gray-medium rounded-xl text-[9px] font-black flex items-center">{loc.max_bw_size}</span>
                            </div>

                            <div className="mt-auto space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(loc.assigned_user?.full_name || 'U')}&background=EB1C24&color=fff`} className="w-6 h-6 rounded-full" alt="" />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1 text-left">Encargado</span>
                                        <span className="text-[11px] font-bold text-gray-dark truncate">{loc.assigned_user?.full_name || 'Sin Asignar'}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => handleEdit(loc)} className="bg-gray-50 text-gray-medium py-2 rounded-xl text-[10px] font-black uppercase hover:bg-secondary/10 hover:text-secondary transition-all">Editar</button>
                                    <button onClick={() => handleDelete(loc.id)} className="bg-gray-50 text-gray-medium py-2 rounded-xl text-[10px] font-black uppercase hover:bg-primary/10 hover:text-primary transition-all">Eliminar</button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
