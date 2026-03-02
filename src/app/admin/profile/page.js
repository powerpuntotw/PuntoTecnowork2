'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, CreditCard, Save, LogOut, ShieldCheck, Mail, Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

const supabase = createClient();

export default function AdminProfilePage() {
    const { profile, signOut } = useAuth();
    const { showToast } = useToast();

    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        dni: profile?.dni || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.full_name) return showToast('El nombre es obligatorio', 'error');
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update(form).eq('id', profile.id);
            if (error) throw error;
            showToast('Perfil de administrador actualizado', 'success');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                <div className="p-2 bg-gray-dark/10 rounded-xl"><ShieldCheck className="w-6 h-6 text-gray-dark" /></div>
                Mi Perfil Administrativo
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[32px] p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-r from-primary to-orange-500" />
                        <div className="relative mt-8">
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-gray-200">
                                <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'A')}&background=EB1C24&color=fff`} className="w-full h-full object-cover" alt="" />
                            </div>
                            <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-primary hover:scale-110 transition-transform">
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>
                        <h3 className="mt-6 font-black text-xl text-gray-dark tracking-tight">{profile?.full_name || 'Administrador'}</h3>
                        <p className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest mt-2">Nivel SuperUser</p>

                        <div className="w-full mt-8 pt-6 border-t border-gray-50 flex flex-col gap-3 text-left">
                            <div className="flex items-center gap-3 text-gray-medium">
                                <Mail className="w-4 h-4" />
                                <span className="text-xs font-medium truncate">{profile?.email}</span>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-3 py-4 bg-gray-50 text-gray- medium rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all">
                        <LogOut className="w-4 h-4" /> Finalizar Sesión
                    </button>
                </motion.div>

                {/* Form Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
                    <div className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100">
                        <h3 className="text-xs font-black text-gray-medium uppercase tracking-[0.3em] mb-10 pb-4 border-b border-gray-50">Configuraciones de Usuario</h3>
                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-medium uppercase tracking-widest flex items-center gap-2"><User className="w-3 h-3" /> Nombre Personal</label>
                                    <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-medium uppercase tracking-widest flex items-center gap-2"><Phone className="w-3 h-3" /> Contacto Móvil</label>
                                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-medium uppercase tracking-widest flex items-center gap-2"><CreditCard className="w-3 h-3" /> Documento (DNI)</label>
                                    <input value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm" />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50 flex justify-end">
                                <button type="submit" disabled={saving} className="bg-gray-dark text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg flex items-center gap-3 hover:bg-primary transition-all disabled:opacity-50">
                                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Aplicando...' : 'Sincronizar Datos'}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
