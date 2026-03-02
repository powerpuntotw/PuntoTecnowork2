'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, TrendingUp, AlertTriangle, Trash2, Database, ShieldCheck, Activity, Search, RefreshCw, ToggleLeft as Toggle, Loader, Cpu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DEFAULT_PRICES = {
    a4_eco: 120, a4_high: 180,
    a3_eco: 200, a3_high: 250,
    oficio_eco: 130, oficio_high: 190,
    foto_10x15: 50, foto_13x18: 80, foto_a4: 250
};

const supabase = createClient();

export default function AdminMaintenancePage() {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [prices, setPrices] = useState(DEFAULT_PRICES);
    const [inflationPercent, setInflationPercent] = useState('');

    const [maintSettings, setMaintSettings] = useState({ autoCleanup: false, lastCleanup: null });
    const [dbStatus, setDbStatus] = useState('unknown');
    const [storageFiles, setStorageFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [fileSearch, setFileSearch] = useState('');
    const [deletingFile, setDeletingFile] = useState(null);

    const loadSettings = async () => {
        try {
            const [pricesRes, maintRes] = await Promise.all([
                supabase.from('app_settings').select('value').eq('id', 'print_prices').maybeSingle(),
                supabase.from('app_settings').select('value').eq('id', 'maintenance_settings').maybeSingle()
            ]);

            if (pricesRes.data?.value) setPrices(pricesRes.data.value);
            if (maintRes.data?.value) setMaintSettings(maintRes.data.value);
        } catch (err) {
            showToast('Error cargando configuración', 'error');
        } finally {
            setLoading(false);
        }
    };

    const checkDBHealth = async () => {
        setDbStatus('checking');
        try {
            const { error } = await supabase.from('app_settings').select('id').limit(1);
            if (error) throw error;
            setDbStatus('healthy');
        } catch (err) {
            setDbStatus('error');
        }
    };

    const loadStorageFiles = async () => {
        setLoadingFiles(true);
        try {
            const allFiles = [];
            const { data: level1 } = await supabase.storage.from('print-files').list('', { limit: 100 });

            for (const folder1 of (level1 || [])) {
                if (folder1.id) {
                    allFiles.push({ ...folder1, fullPath: folder1.name });
                } else {
                    const { data: level2 } = await supabase.storage.from('print-files').list(folder1.name, { limit: 100 });
                    for (const folder2 of (level2 || [])) {
                        if (folder2.id) {
                            allFiles.push({ ...folder2, fullPath: `${folder1.name}/${folder2.name}` });
                        } else {
                            const { data: level3 } = await supabase.storage.from('print-files').list(`${folder1.name}/${folder2.name}`, { limit: 100 });
                            for (const file of (level3 || [])) {
                                if (file.id) {
                                    allFiles.push({ ...file, fullPath: `${folder1.name}/${folder2.name}/${file.name}` });
                                }
                            }
                        }
                    }
                }
            }
            allFiles.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            setStorageFiles(allFiles);
        } catch (err) {
            showToast('Error en Storage', 'error');
        } finally {
            setLoadingFiles(false);
        }
    };

    useEffect(() => {
        loadSettings();
        checkDBHealth();
    }, []);

    const handleSavePrimary = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('app_settings').upsert({ id: 'print_prices', value: prices });
            if (error) throw error;
            await supabase.from('admin_audit_logs').insert({
                admin_id: user.id,
                action: 'update_global_prices',
                target_type: 'app_settings',
                details: { description: 'Precios globales actualizados desde panel de mantenimiento' }
            });
            showToast('Configuracion aplicada', 'success');
        } catch (err) {
            showToast('Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const applyInflation = () => {
        const percent = parseFloat(inflationPercent);
        if (isNaN(percent) || percent <= 0) return showToast('Porcentaje inválido', 'error');

        const multiplier = 1 + (percent / 100);
        const newPrices = { ...prices };
        Object.keys(newPrices).forEach(key => {
            newPrices[key] = Math.round((newPrices[key] * multiplier) / 10) * 10;
        });
        setPrices(newPrices);
        setInflationPercent('');
        showToast('Nuevos valores calculados. Presioná Guardar para aplicar.', 'info');
    };

    const deleteFile = async (file) => {
        if (!confirm(`¿Borrar ${file.name}?`)) return;
        setDeletingFile(file.fullPath);
        try {
            const { error } = await supabase.storage.from('print-files').remove([file.fullPath]);
            if (error) throw error;
            showToast('Archivo eliminado', 'success');
            loadStorageFiles();
        } catch (err) {
            showToast('Error al borrar', 'error');
        } finally {
            setDeletingFile(null);
        }
    };

    if (loading) return <div className="p-8"><div className="shimmer h-[60vh] rounded-[32px]" /></div>;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-dark tracking-tighter uppercase flex items-center gap-3">
                        <div className="p-2 bg-gray-dark/10 rounded-xl"><Cpu className="w-6 h-6 text-gray-dark" /></div>
                        Configuración de Sistema
                    </h2>
                    <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest mt-1">Gestión técnica y herramientas de mantenimiento</p>
                </div>
                <button onClick={handleSavePrimary} disabled={saving} className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-brand flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Aplicar Configuración Global
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Global Prices */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-10 pb-4 border-b border-gray-50">
                        <Settings className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-black text-gray-dark uppercase tracking-widest">Matriz de Precios Globales</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
                        <PriceSection title="Formato Estándar (A4)" items={[
                            { label: 'Económico B&N', id: 'a4_eco' },
                            { label: 'Full Color', id: 'a4_high' }
                        ]} prices={prices} setPrices={setPrices} />

                        <PriceSection title="Formato Grande (A3)" items={[
                            { label: 'Económico B&N', id: 'a3_eco' },
                            { label: 'Full Color', id: 'a3_high' }
                        ]} prices={prices} setPrices={setPrices} />

                        <PriceSection title="Formato Legal (Oficio)" items={[
                            { label: 'Económico B&N', id: 'oficio_eco' },
                            { label: 'Full Color', id: 'oficio_high' }
                        ]} prices={prices} setPrices={setPrices} />

                        <PriceSection title="Servicio FotoYa" items={[
                            { label: '10 x 15 cm', id: 'foto_10x15' },
                            { label: '13 x 18 cm', id: 'foto_13x18' },
                            { label: 'Fotocromo A4', id: 'foto_a4' }
                        ]} prices={prices} setPrices={setPrices} />
                    </div>
                </motion.div>

                {/* Technical Sidebars */}
                <div className="space-y-8">
                    {/* Inflation Tool */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <TrendingUp className="w-20 h-20 -rotate-12" />
                        </div>
                        <h4 className="text-[10px] font-black text-gray-dark uppercase tracking-widest mb-4 flex items-center gap-2">
                            Ajuste Inflacionario
                        </h4>
                        <p className="text-xs text-gray-medium mb-6 font-medium">Incrementa toda la matriz de precios base simultáneamente.</p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input type="number" value={inflationPercent} onChange={e => setInflationPercent(e.target.value)} placeholder="Ej: 15" className="w-full bg-gray-50 px-4 py-3 rounded-xl font-bold text-sm outline-none focus:bg-white focus:ring-2 focus:ring-accent/20 transition-all" />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">%</span>
                            </div>
                            <button onClick={applyInflation} className="bg-accent text-gray-dark px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm hover:brightness-110 active:scale-95 transition-all">
                                Simular
                            </button>
                        </div>
                    </motion.div>

                    {/* DB Status */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100">
                        <h4 className="text-[10px] font-black text-gray-dark uppercase tracking-widest mb-6 flex items-center gap-2">
                            Estado del Backend
                        </h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${dbStatus === 'healthy' ? 'bg-success animate-pulse' : 'bg-red-400'}`} />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Conectividad DB</span>
                                </div>
                                <Activity className={`w-4 h-4 ${dbStatus === 'healthy' ? 'text-success' : 'text-red-400'}`} />
                            </div>
                            <button onClick={checkDBHealth} className="w-full py-3 border-2 border-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 rounded-xl hover:border-primary/20 hover:text-primary transition-all">
                                Ejecutar Diagnóstico
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Advanced Storage Manager */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-3 bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-50 rounded-2xl">
                                <Trash2 className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-dark uppercase tracking-widest">Saneamiento del Almacenamiento</h3>
                                <p className="text-[10px] font-bold text-gray-medium uppercase tracking-tighter mt-1">Borrado directo de archivos en el bucket `print-files`</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                                <input value={fileSearch} onChange={e => setFileSearch(e.target.value)} placeholder="Filtrar por nombre..." className="pl-11 pr-6 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-xs font-bold" />
                            </div>
                            <button onClick={loadStorageFiles} className="p-3 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all group">
                                <RefreshCw className={`w-5 h-5 text-gray-300 group-hover:text-primary transition-colors ${loadingFiles ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto no-scrollbar">
                        {loadingFiles ? (
                            <div className="p-20 text-center space-y-4">
                                <Loader className="w-8 h-8 text-primary animate-spin mx-auto" />
                                <p className="text-[10px] font-black text-gray-medium uppercase tracking-widest">Calculando recursividad en Storage...</p>
                            </div>
                        ) : storageFiles.length === 0 ? (
                            <div className="p-20 text-center">
                                <p className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Sincronización de archivos requerida</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50/50 text-[9px] font-black text-gray-medium uppercase tracking-widest sticky top-0 z-10">
                                    <tr>
                                        <th className="px-8 py-4 text-left">Archivo / Estructura de Ruta</th>
                                        <th className="px-8 py-4 text-left">Peso</th>
                                        <th className="px-8 py-4 text-left">Antigüedad</th>
                                        <th className="px-8 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {storageFiles.filter(f => f.fullPath.toLowerCase().includes(fileSearch.toLowerCase())).map(file => (
                                        <tr key={file.id || file.fullPath} className="hover:bg-gray-50/50 group transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-dark group-hover:text-primary transition-colors truncate max-w-md">{file.name}</span>
                                                    <span className="text-[9px] font-medium text-gray-300 truncate max-w-md">{file.fullPath}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-[10px] font-black text-gray-medium">{file.metadata?.size ? (file.metadata.size / 1024 / 1024).toFixed(2) + ' MB' : '—'}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-[10px] font-bold text-gray-medium">{file.created_at ? format(new Date(file.created_at), 'dd/MM/yy HH:mm', { locale: es }) : '—'}</span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button onClick={() => deleteFile(file)} disabled={deletingFile === file.fullPath} className="p-2.5 text-gray-200 hover:text-primary hover:bg-white hover:shadow-lg rounded-xl transition-all">
                                                    {deletingFile === file.fullPath ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function PriceSection({ title, items, prices, setPrices }) {
    return (
        <div className="space-y-6">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{title}</h4>
            <div className="space-y-5">
                {items.map(item => (
                    <div key={item.id} className="group">
                        <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2 block group-focus-within:text-gray-dark transition-colors">{item.label}</label>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-gray-200">$</span>
                            <input
                                type="number"
                                value={prices[item.id] || ''}
                                onChange={e => setPrices({ ...prices, [item.id]: Number(e.target.value) })}
                                className="w-full pl-10 pr-6 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-black text-sm tracking-tight"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
