'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Plus, Trash2, Save, X, Star, Upload as UploadIcon, Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createClient();

export default function AdminRewardsPage() {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', points_required: '', category: '', stock_quantity: '', active: true });
    const [editId, setEditId] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const imageRef = useRef(null);

    const fetchRewards = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('rewards_catalog').select('*').order('points_required');
            if (error) throw error;
            setRewards(data || []);
        } catch (err) {
            console.error('Error fetching rewards:', err);
            showToast('Error cargando catálogo', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRewards();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name || !form.points_required) return showToast('Completa los campos obligatorios', 'error');

        setSubmitting(true);
        const payload = {
            ...form,
            points_required: Number(form.points_required),
            stock_quantity: Number(form.stock_quantity || 0)
        };

        try {
            if (imageFile) {
                const ext = imageFile.name.split('.').pop();
                const filePath = `rewards/${Date.now()}.${ext}`;
                const { error: uploadErr } = await supabase.storage.from('brand-assets').upload(filePath, imageFile, { upsert: true });
                if (uploadErr) throw uploadErr;
                const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(filePath);
                payload.image_url = publicUrl;
            }

            if (editId) {
                const { error } = await supabase.from('rewards_catalog').update(payload).eq('id', editId);
                if (error) throw error;
                await supabase.from('admin_audit_logs').insert({
                    admin_id: user.id,
                    action: 'update_reward',
                    target_id: editId,
                    target_type: 'reward',
                    details: { description: `Premio ${payload.name} actualizado` }
                });
                showToast('Premio actualizado', 'success');
            } else {
                const { data, error } = await supabase.from('rewards_catalog').insert(payload).select().single();
                if (error) throw error;
                await supabase.from('admin_audit_logs').insert({
                    admin_id: user.id,
                    action: 'create_reward',
                    target_id: data.id,
                    target_type: 'reward',
                    details: { description: `Premio ${payload.name} creado` }
                });
                showToast('Premio creado', 'success');
            }
            resetForm();
            fetchRewards();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (r) => {
        setForm({
            name: r.name,
            description: r.description || '',
            points_required: r.points_required,
            category: r.category || '',
            stock_quantity: r.stock_quantity || 0,
            active: r.active
        });
        setEditId(r.id);
        setImagePreview(r.image_url || null);
        setImageFile(null);
        setShowForm(true);
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`¿Eliminar el premio "${name}" del catálogo?`)) return;
        try {
            const { error } = await supabase.from('rewards_catalog').delete().eq('id', id);
            if (error) throw error;
            await supabase.from('admin_audit_logs').insert({
                admin_id: user.id,
                action: 'delete_reward',
                target_id: id,
                target_type: 'reward',
                details: { description: `Premio ${name} eliminado` }
            });
            showToast('Eliminado satisfactoriamente', 'success');
            fetchRewards();
        } catch (err) {
            showToast('Error al eliminar', 'error');
        }
    };

    const resetForm = () => {
        setForm({ name: '', description: '', points_required: '', category: '', stock_quantity: '', active: true });
        setEditId(null);
        setShowForm(false);
        setImageFile(null);
        setImagePreview(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl"><Gift className="w-6 h-6 text-primary" /></div>
                    Catálogo de Premios
                </h2>
                {!showForm && (
                    <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-brand hover:scale-105 transition-all">
                        <Plus className="w-5 h-5" /> Nuevo Premio
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-black text-gray-dark uppercase tracking-widest text-xs">{editId ? 'Configurar' : 'Crear'} Recompensa</h3>
                            <button onClick={resetForm} className="p-2 hover:bg-gray-200 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-medium" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-medium uppercase tracking-[0.2em] mb-2 block">Nombre del Premio</label>
                                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Café Gratis" className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-medium uppercase tracking-[0.2em] mb-2 block">Categoría</label>
                                        <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ej: Gastronomía" className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-medium uppercase tracking-[0.2em] mb-2 block">PTS Requeridos</label>
                                            <input type="number" value={form.points_required} onChange={e => setForm({ ...form, points_required: e.target.value })} placeholder="0" className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-black text-sm text-primary" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-medium uppercase tracking-[0.2em] mb-2 block">Stock Disponible</label>
                                            <input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} placeholder="∞" className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-black text-sm" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-medium uppercase tracking-[0.2em] mb-2 block">Imagen Promocional</label>
                                        <div className="flex flex-col items-center gap-4 bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-100 group hover:border-primary/20 transition-colors">
                                            {(imagePreview || imageFile) ? (
                                                <img src={imageFile ? URL.createObjectURL(imageFile) : imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-2xl shadow-lg border-2 border-white ring-4 ring-primary/5" />
                                            ) : (
                                                <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center text-gray-200 border-2 border-gray-50">
                                                    <UploadIcon className="w-8 h-8 opacity-20" />
                                                </div>
                                            )}
                                            <button type="button" onClick={() => imageRef.current?.click()} className="flex items-center gap-2 px-6 py-2 bg-white text-gray-medium border border-gray-100 rounded-xl text-xs font-black shadow-sm hover:text-primary hover:border-primary transition-all uppercase tracking-tighter">
                                                {imageFile ? 'Cambiar Foto' : 'Subir Archivo'}
                                            </button>
                                            <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files[0]) { setImageFile(e.target.files[0]); setImagePreview(null); } }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-gray-medium uppercase tracking-[0.2em] mb-2 block">Descripción Detallada</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Escribí los beneficios o condiciones del premio..." className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-medium text-sm resize-none" rows="3" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 ${form.active ? 'bg-success' : 'bg-gray-200'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${form.active ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="hidden" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-medium group-hover:text-gray-dark transition-colors">{form.active ? 'Visible en Catálogo' : 'Oculto'}</span>
                                </label>
                                <div className="flex gap-4">
                                    <button type="button" onClick={resetForm} className="px-6 py-3 text-gray-medium font-black text-xs uppercase tracking-widest hover:text-primary transition-colors">Cancelar</button>
                                    <button type="submit" disabled={submitting || !form.name || !form.points_required} className="bg-primary text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-brand flex items-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all">
                                        {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {editId ? 'Actualizar' : 'Publicar'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="shimmer h-64 rounded-3xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {rewards.map((r, i) => (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col ${!r.active ? 'grayscale opacity-70' : ''}`}>
                            <div className="h-40 relative bg-gray-50 flex items-center justify-center overflow-hidden">
                                {r.image_url ? (
                                    <img src={r.image_url} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <Gift className="w-12 h-12 text-gray-200" />
                                )}
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-sm flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                                    <span className="font-black text-xs text-gray-dark">{r.points_required} PTS</span>
                                </div>
                                {!r.active && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-white font-black uppercase tracking-widest text-xs rotate-[-15deg] border-2 border-white/30 px-4 py-1">Desactivado</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">{r.category || 'Recompensa'}</p>
                                        <h3 className="font-bold text-gray-dark group-hover:text-primary transition-colors line-clamp-1">{r.name}</h3>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-gray-medium uppercase">Stock</span>
                                        <span className="text-sm font-black text-gray-dark tracking-tighter">{r.stock_quantity ?? '∞'}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-medium mb-6 line-clamp-2 italic leading-relaxed">"{r.description || 'Sin descripción'}"</p>
                                <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                                    <button onClick={() => handleEdit(r)} className="bg-gray-50 text-gray-medium py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-secondary/10 hover:text-secondary transition-all">Editar</button>
                                    <button onClick={() => handleDelete(r.id, r.name)} className="bg-gray-50 text-gray-medium py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all">Eliminar</button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {rewards.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <Gift className="w-16 h-16 text-gray-100 mb-4" />
                    <p className="text-gray-medium font-black uppercase tracking-widest text-xs">No hay premios configurados en el catálogo</p>
                </div>
            )}
        </div>
    );
}
