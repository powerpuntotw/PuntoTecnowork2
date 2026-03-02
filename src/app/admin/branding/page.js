'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Upload, Save, Trash2, Loader, Layout } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

const supabase = createClient();

export default function AdminBrandingPage() {
    const { showToast } = useToast();

    const [branding, setBranding] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [appName, setAppName] = useState('');
    const [tagline, setTagline] = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await supabase.from('app_branding').select('*').single();
                if (data) {
                    setBranding(data);
                    setAppName(data.app_name || '');
                    setTagline(data.tagline || '');
                }
            } catch (err) {
                console.error("Branding fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const uploadLogo = async (file, field) => {
        try {
            const ext = file.name.split('.').pop();
            const filePath = `branding/${field}_${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('brand-assets').upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(filePath);
            const { error: updateError } = await supabase.from('app_branding').update({ [field]: publicUrl }).eq('id', branding.id);
            if (updateError) throw updateError;

            setBranding(prev => ({ ...prev, [field]: publicUrl }));
            showToast('Identidad visual actualizada', 'success');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    const removeLogo = async (field) => {
        if (!confirm('¿Desea eliminar este logo? Se usará el predeterminado del sistema.')) return;
        try {
            const { error } = await supabase.from('app_branding').update({ [field]: null }).eq('id', branding.id);
            if (error) throw error;
            setBranding(prev => ({ ...prev, [field]: null }));
            showToast('Logo removido', 'info');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    const saveText = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('app_branding').update({ app_name: appName, tagline }).eq('id', branding.id);
            if (error) throw error;
            showToast('Configuración guardada', 'success');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const LogoUploader = ({ label, field, description }) => {
        const ref = useRef(null);
        const url = branding?.[field];
        return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 flex flex-col group">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-black text-gray-dark text-[10px] uppercase tracking-widest">{label}</h3>
                        <p className="text-[10px] text-gray-medium">{description}</p>
                    </div>
                    <Layout className={`w-4 h-4 text-gray-100 group-hover:text-primary transition-colors`} />
                </div>

                <div className="relative aspect-video rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center overflow-hidden bg-gray-50 mb-6 group-hover:border-primary/20 transition-all">
                    {url ? (
                        <img src={url} alt={label} className="max-h-[80%] max-w-[80%] object-contain drop-shadow-sm group-hover:scale-105 transition-transform" />
                    ) : (
                        <ImageIcon className="w-10 h-10 text-gray-200" />
                    )}
                </div>

                <div className="flex gap-3 mt-auto">
                    <button onClick={() => ref.current?.click()} className="flex-1 bg-gray-dark text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary transition-colors shadow-sm">
                        <Upload className="w-3.5 h-3.5" /> {url ? 'Reemplazar' : 'Subir'}
                    </button>
                    {url && (
                        <button onClick={() => removeLogo(field)} className="bg-red-50 text-red-600 px-4 py-3 rounded-xl hover:bg-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files[0]) uploadLogo(e.target.files[0], field); }} />
            </motion.div>
        );
    };

    if (loading) return <div className="p-4 space-y-6">{[1, 2, 3].map(i => <div key={i} className="shimmer h-48 rounded-3xl" />)}</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase">Identidad Visual (Branding)</h2>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-black text-gray-medium uppercase tracking-widest">Estado:</span>
                    <span className="text-[10px] font-black text-success uppercase">Configurado</span>
                </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                <h3 className="text-xs font-black text-gray-medium uppercase tracking-[0.3em] mb-8 pb-4 border-b border-gray-50">Configuraciones de Texto</h3>
                <form onSubmit={saveText} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="text-[10px] font-black text-gray-medium uppercase tracking-widest mb-3 block">Nombre del Proyecto</label>
                            <input value={appName} onChange={e => setAppName(e.target.value)} placeholder="Ej: Punto Tecnowork" className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-black text-sm tracking-tight" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-medium uppercase tracking-widest mb-3 block">Tagline / Slogan</label>
                            <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Ej: Impresiones en tiempo real" className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={saving} className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-brand flex items-center gap-3 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all">
                            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Procesando...' : 'Aplicar Cambios'}
                        </button>
                    </div>
                </form>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <LogoUploader label="Logo Principal" field="logo_principal_url" description="Se muestra en el header y login." />
                <LogoUploader label="Logo Footer Light" field="logo_footer_1_url" description="Versión para fondos claros." />
                <LogoUploader label="Logo Footer Dark" field="logo_footer_2_url" description="Versión para temas oscuros." />
            </div>
        </div>
    );
}
