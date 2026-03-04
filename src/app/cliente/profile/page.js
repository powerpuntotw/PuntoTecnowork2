'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, CreditCard, Save, LogOut, Trash2, AlertTriangle, X, Loader, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

const supabase = createClient();

export default function ProfilePage() {
    const { user, profile, signOut, fetchProfile } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isOnboarding = searchParams.get('onboarding') === 'true';

    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        dni: profile?.dni || '',
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const [deleteStep, setDeleteStep] = useState('idle');
    const [blockReasons, setBlockReasons] = useState([]);
    const [confirmText, setConfirmText] = useState('');

    const validate = () => {
        const e = {};
        if (!form.full_name.trim()) e.full_name = 'El nombre es obligatorio';
        else if (form.full_name.trim().length < 3) e.full_name = 'Mínimo 3 caracteres';
        if (form.phone && !/^\d{7,15}$/.test(form.phone.replace(/\s|-/g, ''))) e.phone = 'Teléfono inválido (7-15 dígitos)';
        if (form.dni && !/^\d{7,8}$/.test(form.dni.replace(/\./g, ''))) e.dni = 'DNI inválido (7-8 dígitos)';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate() || !user) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update(form).eq('id', user.id);
            if (error) throw error;
            showToast('Perfil actualizado', 'success');
            await fetchProfile(user.id);
            if (isOnboarding) {
                router.push('/cliente/dashboard');
            }
        } catch (err) {
            showToast('Error al guardar: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRequestDelete = async () => {
        if (!user) return;
        setDeleteStep('checking');
        setBlockReasons([]);
        try {
            const reasons = [];
            const { data: orders } = await supabase.from('print_orders').select('id').eq('customer_id', user.id).in('status', ['pendiente', 'en_proceso', 'listo']);
            if (orders?.length > 0) reasons.push(`Tenés ${orders.length} pedidos activos.`);

            const { data: redemptions } = await supabase.from('reward_redemptions').select('id').eq('user_id', user.id).eq('status', 'pendiente');
            if (redemptions?.length > 0) reasons.push(`Tenés ${redemptions.length} canjes pendientes.`);

            if (reasons.length > 0) {
                setBlockReasons(reasons);
                setDeleteStep('blocked');
            } else {
                setDeleteStep('confirm');
            }
        } catch (err) {
            showToast('Error de verificación', 'error');
            setDeleteStep('idle');
        }
    };

    const handleConfirmDelete = async () => {
        if (confirmText !== 'ELIMINAR') return;
        setDeleteStep('deleting');
        try {
            const { error } = await supabase.rpc('delete_user_account');
            if (error) throw error;
            showToast('Cuenta eliminada', 'success');
            await signOut();
            router.push('/login');
        } catch (err) {
            showToast('Error al eliminar', 'error');
            setDeleteStep('idle');
        }
    };

    return (
        <div className="p-4 max-w-lg mx-auto">
            {isOnboarding && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-primary/10 border-2 border-primary/20 rounded-2xl flex items-start gap-3"
                >
                    <Info className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-gray-dark mb-1">¡Te damos la bienvenida!</h3>
                        <p className="text-sm text-gray-medium">Por favor completá tus datos de contacto para empezar a usar la aplicación. El teléfono es necesario para comunicarnos por tus pedidos.</p>
                    </div>
                </motion.div>
            )}

            <h2 className="text-2xl font-bold text-gray-dark mb-6">{isOnboarding ? 'Completar Perfil' : 'Mi Perfil'}</h2>

            <motion.div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/20">
                        {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <p className="font-bold text-gray-dark">{profile?.full_name || 'Nombre'}</p>
                        <p className="text-sm text-gray-medium">{profile?.email}</p>
                        <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded-full uppercase">{profile?.user_type}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-dark mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5" />Nombre completo</label>
                        <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
                        {errors.full_name && <p className="text-[10px] text-primary font-bold mt-1">{errors.full_name}</p>}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-dark mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Teléfono</label>
                        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Ej: 1123456789" className={`w-full px-4 py-2 border ${errors.phone ? 'border-primary' : 'border-gray-200'} rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all`} />
                        {errors.phone && <p className="text-[10px] text-primary font-bold mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-dark mb-1 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />DNI</label>
                        <input value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} placeholder="Ej: 35123456" className={`w-full px-4 py-2 border ${errors.dni ? 'border-primary' : 'border-gray-200'} rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all`} />
                        {errors.dni && <p className="text-[10px] text-primary font-bold mt-1">{errors.dni}</p>}
                    </div>
                </div>

                <button onClick={handleSave} disabled={saving} className="w-full mt-6 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-brand disabled:opacity-50">
                    <Save className="w-5 h-5" /> {saving ? 'Guardando...' : (isOnboarding ? 'Comenzar' : 'Guardar Cambios')}
                </button>
            </motion.div>

            {!isOnboarding && (
                <>
                    <button onClick={signOut} className="w-full mt-6 flex items-center justify-center gap-2 text-gray-medium hover:text-primary transition-colors py-2">
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </button>

                    <div className="mt-12 border-2 border-red-50 rounded-2xl p-6 bg-white shadow-sm">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            <h4 className="font-bold">Zona de Riesgo</h4>
                        </div>
                        <p className="text-xs text-gray-medium mb-4">La eliminación de cuenta es permanente e irreversible.</p>

                        {deleteStep === 'idle' && (
                            <button onClick={handleRequestDelete} className="text-red-600 text-xs font-bold border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">Eliminar mi cuenta</button>
                        )}

                        {deleteStep === 'checking' && <div className="flex items-center gap-2 text-xs text-gray-medium"><Loader className="w-4 h-4 animate-spin" /> Verificando...</div>}

                        {deleteStep === 'blocked' && (
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <p className="text-xs font-bold text-red-700 mb-2">No podés borrar tu cuenta:</p>
                                {blockReasons.map((r, i) => <p key={i} className="text-[10px] text-red-600">• {r}</p>)}
                                <button onClick={() => setDeleteStep('idle')} className="mt-3 text-[10px] font-bold uppercase text-red-700 underline">Entendido</button>
                            </div>
                        )}

                        {deleteStep === 'confirm' && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-dark">Escribí <span className="font-mono bg-red-100 text-red-700 px-1 rounded">ELIMINAR</span> para confirmar:</p>
                                <input value={confirmText} onChange={e => setConfirmText(e.target.value)} className="w-full px-3 py-2 border-2 border-red-100 rounded-xl outline-none focus:border-red-300 transition-all font-mono" />
                                <div className="flex gap-2">
                                    <button onClick={handleConfirmDelete} disabled={confirmText !== 'ELIMINAR'} className="flex-1 bg-red-600 text-white rounded-xl py-2 text-xs font-bold disabled:opacity-30">Confirmar</button>
                                    <button onClick={() => setDeleteStep('idle')} className="flex-1 bg-gray-100 text-gray-medium rounded-xl py-2 text-xs font-bold">Cancelar</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
