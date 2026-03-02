'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertTriangle, ArrowRight, DollarSign, Layout, Smartphone, Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

const supabase = createClient();

export default function LocalPricesPage() {
    const { profile } = useAuth();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allowed, setAllowed] = useState(false);

    const [globalPrices, setGlobalPrices] = useState({});
    const [customPrices, setCustomPrices] = useState({
        a4_eco: '', a4_high: '',
        a3_eco: '', a3_high: '',
        oficio_eco: '', oficio_high: '',
        foto_10x15: '', foto_13x18: '', foto_a4: ''
    });

    useEffect(() => {
        const loadPrices = async () => {
            if (!profile?.location_id) return;
            try {
                const { data: locData } = await supabase.from('printing_locations').select('allow_custom_prices, custom_prices').eq('id', profile.location_id).single();
                if (locData) {
                    setAllowed(locData.allow_custom_prices);
                    if (locData.custom_prices) setCustomPrices({ ...customPrices, ...locData.custom_prices });
                }

                const { data: globalData } = await supabase.from('app_settings').select('value').eq('id', 'print_prices').single();
                if (globalData?.value) setGlobalPrices(globalData.value);
            } finally {
                setLoading(false);
            }
        };
        loadPrices();
    }, [profile?.location_id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const cleanedPrices = {};
            Object.keys(customPrices).forEach(key => {
                if (customPrices[key] !== '' && customPrices[key] !== null) cleanedPrices[key] = Number(customPrices[key]);
            });

            const { error } = await supabase.from('printing_locations').update({ custom_prices: Object.keys(cleanedPrices).length > 0 ? cleanedPrices : null }).eq('id', profile.location_id);
            if (error) throw error;

            await supabase.from('admin_audit_logs').insert({
                admin_id: profile.id,
                action: 'update_local_prices',
                target_id: profile.location_id,
                target_type: 'location_prices',
                details: { description: Object.keys(cleanedPrices).length > 0 ? 'Actualización de precios locales' : 'Restablecimiento a precios globales' }
            });

            showToast('Configuración sincronizada', 'success');
        } catch (err) {
            showToast('Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8"><div className="shimmer h-[70vh] rounded-[40px]" /></div>;

    const InputGroup = ({ label, id }) => (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{label}</label>
            <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-sm">$</div>
                <input type="number" value={customPrices[id] || ''} onChange={e => setCustomPrices({ ...customPrices, [id]: e.target.value })}
                    placeholder={globalPrices[id] || '0'}
                    className={`w-full bg-gray-50 border-2 rounded-2xl pl-10 pr-5 py-3.5 font-bold text-sm outline-none transition-all ${customPrices[id] ? 'border-primary/20 bg-primary/[0.02] text-primary' : 'border-transparent focus:border-gray-200'}`} />
            </div>
            {!customPrices[id] && <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter px-1 flex items-center gap-1.5"><Layout className="w-3 h-3" /> Usando Global: ${globalPrices[id] || 0}</p>}
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl"><DollarSign className="w-6 h-6 text-primary" /></div>
                        Gestión Arancelaria
                    </h2>
                    <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest mt-1">Configuración de sobrecostos y márgenes locales</p>
                </div>
                {allowed && (
                    <button onClick={handleSave} disabled={saving} className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-brand hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                        {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Sincronizar Cambios
                    </button>
                )}
            </div>

            {!allowed ? (
                <div className="bg-white rounded-[40px] p-12 shadow-2xl border border-gray-100 flex flex-col items-center text-center">
                    <div className="p-8 bg-primary/10 rounded-full mb-8"><AlertTriangle className="w-12 h-12 text-primary animate-pulse" /></div>
                    <h3 className="text-2xl font-black text-gray-dark tracking-tighter uppercase mb-2">Restricción de Precios</h3>
                    <p className="max-w-md text-sm font-medium text-gray-medium leading-relaxed mb-10">Tu sucursal no tiene habilitada la edición de aranceles. Los precios se rigen por la política global del administrador.</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                        <ReadOnlyPrice label="A4 B&N" value={globalPrices.a4_eco} />
                        <ReadOnlyPrice label="A4 Color" value={globalPrices.a4_high} />
                        <ReadOnlyPrice label="Oficio B&N" value={globalPrices.oficio_eco} />
                        <ReadOnlyPrice label="Oficio Color" value={globalPrices.oficio_high} />
                        <ReadOnlyPrice label="A3 B&N" value={globalPrices.a3_eco} />
                        <ReadOnlyPrice label="A3 Color" value={globalPrices.a3_high} />
                        <ReadOnlyPrice label="Foto 10x15" value={globalPrices.foto_10x15} />
                        <ReadOnlyPrice label="Foto 13x18" value={globalPrices.foto_13x18} />
                        <ReadOnlyPrice label="Foto A4" value={globalPrices.foto_a4} />
                    </div>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[40px] p-10 shadow-xl border border-gray-100 grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-12">
                        <section>
                            <h4 className="text-xs font-black text-gray-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                <div className="w-2 h-2 bg-primary rounded-full shadow-brand" /> Papelería Estándar
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                                <InputGroup label="A4 Económico (B&N)" id="a4_eco" />
                                <InputGroup label="A4 Premium (Color)" id="a4_high" />
                                <InputGroup label="Oficio Económico (B&N)" id="oficio_eco" />
                                <InputGroup label="Oficio Premium (Color)" id="oficio_high" />
                                <InputGroup label="A3 Económico (B&N)" id="a3_eco" />
                                <InputGroup label="A3 Premium (Color)" id="a3_high" />
                            </div>
                        </section>

                        <section>
                            <h4 className="text-xs font-black text-gray-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                <div className="w-2 h-2 bg-secondary rounded-full shadow-brand" /> Fotografía Flash (FotoYa)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InputGroup label="Medida 10x15" id="foto_10x15" />
                                <InputGroup label="Medida 13x18" id="foto_13x18" />
                                <InputGroup label="Medida A4" id="foto_a4" />
                            </div>
                        </section>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-dark rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <Layout className="w-12 h-12 mb-6 text-primary transition-transform group-hover:scale-110 duration-500" />
                            <h4 className="text-lg font-black tracking-tighter uppercase mb-4">Lógica de Cascada</h4>
                            <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">
                                Si dejas un campo vacío, el sistema automáticamente usará el precio global para que nunca te quedes sin facturar.
                            </p>
                            <div className="mt-8 flex items-center gap-3">
                                <div className="bg-white/10 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">Global</div>
                                <ArrowRight className="w-4 h-4 text-primary" />
                                <div className="bg-primary/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary">Local</div>
                            </div>
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mb-16" />
                        </div>

                        <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100">
                            <Smartphone className="w-8 h-8 mb-4 text-gray-400" />
                            <h5 className="text-xs font-black text-gray-dark uppercase tracking-widest mb-2">Visibilidad de Cliente</h5>
                            <p className="text-[10px] font-medium text-gray-400 leading-relaxed uppercase">
                                Tus precios sincronizados impactan inmediatamente en la App del cliente cuando este selecciona tu local para imprimir.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

function ReadOnlyPrice({ label, value }) {
    return (
        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-3">{label}</p>
            <p className="text-2xl font-black text-gray-dark tracking-tighter">${value || 0}</p>
        </div>
    );
}
