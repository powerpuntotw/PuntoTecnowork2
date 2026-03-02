'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, CreditCard, Save, LogOut, MapPin, Building, Shield, ChevronRight, Loader, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

const supabase = createClient();

export default function LocalProfilePage() {
    const { user, profile, signOut } = useAuth();
    const { showToast } = useToast();

    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        dni: profile?.dni || '',
    });
    const [location, setLocation] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLocation = async () => {
            if (profile?.location_id) {
                const { data } = await supabase.from('printing_locations').select('*').eq('id', profile.location_id).maybeSingle();
                setLocation(data);
            }
            setLoading(false);
        };
        fetchLocation();
    }, [profile?.location_id]);

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update(form).eq('id', user.id);
            if (error) throw error;
            showToast('Perfil actualizado ✓', 'success');
        } catch (err) {
            showToast('Error al actualizar', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8"><div className="shimmer h-[70vh] rounded-[40px]" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div>
                <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl"><User className="w-6 h-6 text-primary" /></div>
                    Gestión de Perfil
                </h2>
                <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest mt-1">Configuración técnica de cuenta local</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Identity Card */}
                <div className="lg:col-span-1 space-y-6">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-dark rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="relative mb-6">
                                <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=EB1C24&color=fff&bold=true`}
                                    className="w-24 h-24 rounded-[32px] object-cover border-4 border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-500" alt="" />
                                <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-xl shadow-brand"><Shield className="w-4 h-4 text-white" /></div>
                            </div>
                            <h3 className="text-lg font-black tracking-tighter uppercase leading-none mb-2">{profile?.full_name}</h3>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-8">{profile?.email}</p>

                            <div className="flex gap-2 mb-8">
                                <span className="bg-primary px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-brand">Operador</span>
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/10 ${location?.status === 'activo' ? 'text-success' : 'text-gray-medium'}`}>
                                    {location?.status === 'activo' ? 'En Línea' : 'Inactivo'}
                                </span>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32" />
                    </motion.div>

                    {location && (
                        <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-xl">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Building className="w-4 h-4 text-primary" /> Sucursal Asignada
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-black text-gray-dark uppercase tracking-tight">{location.name}</p>
                                    <p className="text-[11px] font-medium text-gray-medium flex items-center gap-2 mt-2">
                                        <MapPin className="w-3.5 h-3.5 text-primary" /> {location.address}
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Estado</p>
                                    <span className="text-[10px] font-black text-success uppercase">Verificado ✓</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Personal Info Form */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[40px] p-10 shadow-xl border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <ProfileField icon={<User />} label="Nombre Completo" value={form.full_name}
                                onChange={v => setForm({ ...form, full_name: v })} placeholder="Tu nombre" />
                            <div className="space-y-2 opacity-50">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2"><Mail className="w-3 h-3" /> Correo de Acceso</label>
                                <div className="bg-gray-50 rounded-2xl px-6 py-4 font-bold text-sm text-gray-400 cursor-not-allowed border border-gray-100">{profile?.email}</div>
                            </div>
                            <ProfileField icon={<Phone />} label="Teléfono de Contacto" value={form.phone}
                                onChange={v => setForm({ ...form, phone: v })} placeholder="299 1234567" />
                            <ProfileField icon={<CreditCard />} label="Documento de Identidad" value={form.dni}
                                onChange={v => setForm({ ...form, dni: v })} placeholder="8 dígitos" />
                        </div>

                        <div className="mt-12 flex flex-col md:flex-row items-center gap-6">
                            <button onClick={handleSave} disabled={saving}
                                className="w-full md:w-auto bg-primary text-white px-12 py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-brand hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />} Guardar Información
                            </button>
                            <button onClick={signOut} className="text-[10px] font-black text-gray-medium uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2 group">
                                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Cerrar sesión segura
                            </button>
                        </div>
                    </motion.div>

                    <div className="bg-primary/5 rounded-[40px] p-8 border border-primary/10 flex items-center gap-6">
                        <div className="bg-white p-4 rounded-3xl shadow-sm"><AlertCircle className="w-6 h-6 text-primary" /></div>
                        <p className="text-xs font-bold text-gray-dark leading-relaxed">
                            Cualquier cambio en tu rango jerárquico o asignación de local debe ser gestionado por un Administrador de Red.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileField({ icon, label, value, onChange, placeholder }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                {icon && <span className="text-primary">{icon}</span>} {label}
            </label>
            <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:border-primary/20 focus:bg-white transition-all shadow-inner" />
        </div>
    );
}
