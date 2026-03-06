'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle, Star, MapPin, Loader, ArrowLeft, ArrowRight, FileText, Camera, DollarSign, Palette, Printer } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import confetti from 'canvas-confetti';

const SIZES = [
    { id: '10x15', name: '10x15 cm', dimensions: 'Fotografía', type: 'foto' },
    { id: '13x18', name: '13x18 cm', dimensions: 'Fotografía', type: 'foto' },
    { id: 'foto_a4', name: 'A4', dimensions: 'Fotografía', type: 'foto' },
    { id: 'a4', name: 'A4', dimensions: '21x29.7 cm', type: 'doc' },
    { id: 'oficio', name: 'Oficio (Legal)', dimensions: '21.5x35.5 cm', type: 'doc' },
    { id: 'a3', name: 'A3', dimensions: '29.7x42 cm', type: 'doc' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const supabase = createClient();

export default function UploadFilesPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const [step, setStep] = useState(1);
    const [files, setFiles] = useState([]);

    const [locations, setLocations] = useState([]);
    const [globalPrices, setGlobalPrices] = useState({});

    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [quality, setQuality] = useState('standard');
    const [copies, setCopies] = useState(1);

    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderResult, setOrderResult] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [locsRes, pricesRes] = await Promise.all([
            supabase.from('printing_locations').select('*').eq('status', 'activo').order('name'),
            supabase.from('app_settings').select('value').eq('id', 'print_prices').single()
        ]);
        setLocations(locsRes.data || []);
        if (pricesRes.data?.value) {
            setGlobalPrices(pricesRes.data.value);
        }
    };

    const handleFiles = (newFiles) => {
        const valid = Array.from(newFiles || []).filter(f => {
            if (f.size > MAX_FILE_SIZE) { showToast(`${f.name}: Máximo 10MB`, 'error'); return false; }
            if (!ALLOWED_TYPES.includes(f.type)) { showToast(`${f.name}: Tipo no permitido`, 'error'); return false; }
            return true;
        });
        setFiles(prev => [...prev, ...valid.map(f => ({ file: f, name: f.name, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null }))]);
    };

    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); };
    const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

    const getUnitPrice = (sizeId, q = 'standard') => {
        if (!selectedLocation) return 0;
        const loc = locations.find(l => l.id === selectedLocation);
        let priceKey = '';
        if (sizeId.startsWith('10x') || sizeId.startsWith('13x') || sizeId === 'foto_a4') {
            // Logic in original was slightly weird: if (sizeId.startsWith('foto')) priceKey = `foto_${sizeId}`; 
            // but '10x15' doesn't start with 'foto'. Let's adapt to what globalPrices likely uses.
            priceKey = sizeId.startsWith('foto') ? sizeId : `foto_${sizeId}`;
        } else {
            priceKey = `${sizeId}_${q === 'premium' ? 'high' : 'eco'}`;
        }

        if (loc?.allow_custom_prices && loc?.custom_prices && loc.custom_prices[priceKey]) {
            return loc.custom_prices[priceKey];
        }

        return globalPrices[priceKey] || 0;
    };

    const calculateTotal = () => {
        if (!selectedSize || !selectedLocation) return 0;
        const unit = getUnitPrice(selectedSize, quality);
        return unit * files.length * copies;
    };

    const calculatePoints = () => Math.floor(calculateTotal() * 0.1);

    const handleSubmit = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const tempOrderId = typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

            const uploadedFiles = [];

            // Upload each file via server-side API route.
            // Sending FormData works reliably on all mobile browsers,
            // unlike client-side arrayBuffer() + Supabase SDK which can hang.
            for (let i = 0; i < files.length; i++) {
                const { file } = files[i];
                const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const filePath = `${user.id}/${tempOrderId}/${i}_${safeName}`;
                const contentType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;

                const formData = new FormData();
                formData.append('file', file);
                formData.append('filePath', filePath);
                formData.append('contentType', contentType);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000);

                const response = await fetch('/api/upload-file', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Error subiendo archivo ${i + 1}`);
                }

                uploadedFiles.push(filePath);
            }

            const total = calculateTotal();
            const pts = calculatePoints();

            // Create order via server-side API route (client-side SDK also hangs on mobile)
            const orderResponse = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_urls: uploadedFiles,
                    location_id: selectedLocation,
                    specifications: { size: selectedSize, quality, copies, color: quality === 'premium' && !!selectedLocObj?.has_color_printing },
                    total_amount: total,
                    points_earned: pts,
                    notes: notes.trim() || null,
                }),
            });

            if (!orderResponse.ok) {
                const errorData = await orderResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error al crear la orden');
            }

            const { order } = await orderResponse.json();

            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#EB1C24', '#FFC905', '#A4CC39', '#0093D8'] });
            setOrderResult(order);
            setStep(5);
        } catch (err) {
            console.error("Error en handleSubmit:", err);
            const message = err.name === 'AbortError'
                ? 'La subida tardó demasiado. Verificá tu conexión e intentá de nuevo.'
                : (err.message || 'Error de red. Intentá de nuevo.');
            showToast('Error al crear la orden: ' + message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedLocObj = locations.find(l => l.id === selectedLocation);

    const availableSizes = SIZES.filter(s => {
        if (s.type === 'foto' && (!selectedLocObj || !selectedLocObj.has_fotoya)) return false;
        if (s.type === 'doc') {
            const maxBw = selectedLocObj?.max_bw_size || 'A4';
            const maxColor = selectedLocObj?.max_color_size || 'A4';
            const bwOk = s.id === 'a3' ? maxBw === 'A3' : true;
            const colorOk = s.id === 'a3' ? maxColor === 'A3' : true;
            if (s.id === 'a3' && !bwOk && !colorOk) return false;
            if (s.id === 'a3' && quality === 'premium' && !colorOk) return false;
        }
        return true;
    });

    const canPrintColor = !!selectedLocObj?.has_color_printing;

    return (
        <div className="p-4 max-w-2xl mx-auto pb-24">
            <div className="flex items-center justify-between mb-8">
                {[1, 2, 3, 4].map(s => (
                    <div key={s} className="flex items-center flex-1 last:flex-none">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm z-10 ${step >= s ? 'bg-primary text-white scale-110' : 'bg-gray-200 text-gray-medium'}`}>{s}</div>
                        {s < 4 && <div className={`flex-1 h-1.5 mx-2 rounded-full transition-all ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h2 className="text-2xl font-bold text-gray-dark mb-6">1. Subí tus Archivos</h2>
                        <div className={`border-3 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
                            <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
                            <p className="text-gray-dark font-medium mb-2">Arrastrá tus archivos aquí</p>
                            <p className="text-gray-medium text-sm mb-4">o hacé clic para seleccionar</p>
                            <button onClick={() => fileInputRef.current?.click()} className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition shadow-brand">Seleccionar Archivos</button>
                            <button onClick={() => cameraInputRef.current?.click()} className="mt-3 bg-secondary text-white px-6 py-3 rounded-xl font-bold hover:bg-secondary/90 transition shadow-brand flex items-center gap-2 mx-auto">
                                <Camera className="w-5 h-5" />Tomar Foto
                            </button>
                            <p className="text-xs text-gray-medium mt-4">JPG, PNG, PDF, DOCX • Máx: 10MB cada uno</p>
                            <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                        </div>
                        {files.length > 0 && (
                            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {files.map((f, i) => (
                                    <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200">
                                        {f.preview ? <img src={f.preview} alt={f.name} className="w-full h-24 object-cover" />
                                            : <div className="w-full h-24 bg-gray-50 flex items-center justify-center"><FileText className="w-8 h-8 text-secondary" /></div>}
                                        <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition"><X className="w-4 h-4" /></button>
                                        <p className="text-[10px] bg-white text-gray-dark font-medium p-1.5 truncate border-t">{f.name}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button disabled={files.length === 0} onClick={() => setStep(2)} className="w-full mt-8 bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition shadow-brand disabled:opacity-50 flex items-center justify-center gap-2 text-lg">
                            Continuar <ArrowRight className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h2 className="text-2xl font-bold text-gray-dark mb-2">2. Seleccioná un Local</h2>
                        <p className="text-gray-medium mb-6">¿Dónde querés retirar tus impresiones?</p>

                        <div className="space-y-4">
                            {locations.map(loc => (
                                <motion.div key={loc.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setSelectedLocation(loc.id)}
                                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedLocation === loc.id ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-primary/50'}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-bold text-gray-dark text-lg">{loc.name}</h3>
                                                {loc.has_fotoya && <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Camera className="w-3 h-3" /> FotoYa</span>}
                                            </div>
                                            <p className="text-sm text-gray-medium flex items-center mb-2"><MapPin className="w-4 h-4 mr-1 text-primary/70" />{loc.address}</p>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-green-700">🟢 Abierto</span>
                                                {loc.has_color_printing && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Palette className="w-3 h-3" /> Color{loc.max_color_size === 'A3' ? ' A3' : ''}</span>}
                                            </div>
                                        </div>
                                        {selectedLocation === loc.id && <CheckCircle className="w-6 h-6 text-primary" />}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setStep(1)} className="bg-gray-100 text-gray-dark px-6 py-4 rounded-xl font-bold hover:bg-gray-200 transition"><ArrowLeft className="w-5 h-5" /></button>
                            <button disabled={!selectedLocation} onClick={() => {
                                if (selectedSize && SIZES.find(s => s.id === selectedSize)?.type === 'foto' && !selectedLocObj?.has_fotoya) {
                                    setSelectedSize(null);
                                }
                                setStep(3);
                            }} className="flex-1 bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-brand text-lg">
                                Continuar <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-dark">3. Configuración</h2>
                                <p className="text-gray-medium">Elegí el formato y cantidad</p>
                            </div>
                            <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {selectedLocObj?.allow_custom_prices ? 'Precios del Local' : 'Precios Globales'}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <label className="block text-gray-dark font-bold mb-3">Formato de Impresión</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {availableSizes.map(size => {
                                        const unitPrice = getUnitPrice(size.id, quality);
                                        return (
                                            <button key={size.id} onClick={() => setSelectedSize(size.id)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${selectedSize === size.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`}>
                                                {selectedSize === size.id && <div className="absolute top-0 right-0 w-8 h-8 bg-primary rounded-bl-xl flex items-center justify-center"><CheckCircle className="w-4 h-4 text-white" /></div>}
                                                <div className="font-bold text-gray-dark text-lg">{size.name}</div>
                                                <div className="text-sm text-gray-medium mb-2">{size.dimensions}</div>
                                                <div className="text-primary font-bold bg-white inline-block px-2 py-1 rounded border border-primary/20 shadow-sm">${unitPrice}/u</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedSize && SIZES.find(s => s.id === selectedSize)?.type === 'doc' && (
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                    <label className="block text-gray-dark font-bold mb-3">Modo de Impresión</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setQuality('standard')} className={`p-4 rounded-xl border-2 text-left transition-all ${quality === 'standard' ? 'border-secondary bg-secondary/5' : 'border-gray-200 hover:border-secondary/50'}`}>
                                            <div className="font-bold text-gray-dark text-lg flex items-center gap-1.5"><Printer className="w-4 h-4" /> B&N</div>
                                            <div className="text-sm text-gray-medium mb-1">Blanco y Negro</div>
                                            <div className="text-secondary font-bold text-sm">${getUnitPrice(selectedSize, 'standard')}/u</div>
                                        </button>
                                        {canPrintColor ? (
                                            <button onClick={() => setQuality('premium')} className={`p-4 rounded-xl border-2 text-left transition-all ${quality === 'premium' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'}`}>
                                                <div className="font-bold text-gray-dark text-lg flex items-center gap-1.5"><Palette className="w-4 h-4 text-yellow-500" /> Color</div>
                                                <div className="text-sm text-gray-medium mb-1">Impresión full color</div>
                                                <div className="text-yellow-600 font-bold text-sm">${getUnitPrice(selectedSize, 'premium')}/u</div>
                                            </button>
                                        ) : (
                                            <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 text-left opacity-60 flex flex-col justify-center">
                                                <div className="font-bold text-gray-400 text-base flex items-center gap-1.5"><Palette className="w-4 h-4" /> Color</div>
                                                <div className="text-xs text-gray-400 mt-1">No disponible</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                                <div>
                                    <label className="block text-gray-dark font-bold">Cantidad de Copias</label>
                                    <span className="text-sm text-gray-medium">De cada archivo</span>
                                </div>
                                <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-2 border border-gray-200">
                                    <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-10 h-10 rounded-lg hover:bg-white hover:shadow transition-all font-bold text-gray-dark">-</button>
                                    <span className="text-2xl font-bold text-gray-dark w-10 text-center">{copies}</span>
                                    <button onClick={() => setCopies(copies + 1)} className="w-10 h-10 rounded-lg hover:bg-white hover:shadow transition-all font-bold text-primary">+</button>
                                </div>
                            </div>
                        </div>

                        {selectedSize && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-success/90 to-primary/90 text-white rounded-2xl p-6 mt-6 shadow-lg">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="font-medium opacity-90">Total estimado</span>
                                    <span className="text-4xl font-bold">${calculateTotal()}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/20 p-3 rounded-xl mt-4">
                                    <span className="font-medium text-sm">Puntos que ganarás</span>
                                    <span className="text-lg font-bold flex items-center gap-1"><Star className="w-5 h-5 fill-current" />+{calculatePoints()}</span>
                                </div>
                            </motion.div>
                        )}
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setStep(2)} className="bg-gray-100 text-gray-dark px-6 py-4 rounded-xl font-bold hover:bg-gray-200 transition"><ArrowLeft className="w-5 h-5" /></button>
                            <button disabled={!selectedSize} onClick={() => setStep(4)} className="flex-1 bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-brand text-lg">
                                Continuar <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h2 className="text-2xl font-bold text-gray-dark mb-6">4. Resumen Final</h2>

                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                    <span className="text-gray-medium font-medium">Archivos</span>
                                    <span className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> {files.length} adjuntos</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                    <span className="text-gray-medium font-medium">Local a retirar</span>
                                    <span className="font-bold text-right pl-4">{selectedLocObj?.name}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                    <span className="text-gray-medium font-medium">Formato</span>
                                    <div className="text-right">
                                        <span className="font-bold">{SIZES.find(s => s.id === selectedSize)?.name}</span>
                                        {SIZES.find(s => s.id === selectedSize)?.type === 'doc' && <span className="text-xs text-gray-medium block capitalize">{quality === 'premium' ? 'Color' : 'Blanco y Negro'}</span>}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                    <span className="text-gray-medium font-medium">Copias totales</span>
                                    <span className="font-bold text-lg">{files.length * copies} <span className="text-sm font-normal text-gray-medium">({copies} por archivo)</span></span>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-6 border-t border-gray-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-dark font-bold text-lg">Total a Pagar</span>
                                    <span className="text-3xl font-black text-gray-dark">${calculateTotal()}</span>
                                </div>
                                <div className="flex justify-end mt-1">
                                    <span className="bg-accent/15 text-accent-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">Recompensa: +{calculatePoints()} pts</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <label className="block text-gray-dark font-bold mb-2">Instrucciones especiales</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Imprimir en alta calidad..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary outline-none" rows="3" maxLength={500} />
                            <p className="text-[10px] text-gray-medium text-right mt-1">{notes.length}/500</p>
                        </div>

                        <label className="flex items-start mb-8 cursor-pointer p-4 bg-primary/5 rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors">
                            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 mr-3 w-5 h-5 accent-primary rounded cursor-pointer" />
                            <span className="text-sm text-gray-dark font-medium leading-tight">Acepto el compromiso de pago al momento de retirar mis impresiones.</span>
                        </label>

                        <div className="flex gap-3">
                            <button onClick={() => setStep(3)} className="bg-gray-100 text-gray-dark px-6 py-4 rounded-xl font-bold hover:bg-gray-200 transition"><ArrowLeft className="w-5 h-5" /></button>
                            <button disabled={!acceptedTerms || isSubmitting} onClick={handleSubmit}
                                className="flex-1 bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-brand text-lg">
                                {isSubmitting ? <><Loader className="w-5 h-5 animate-spin" /> Procesando...</> : <><CheckCircle className="w-5 h-5" /> Confirmar Pedido</>}
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 5 && orderResult && (
                    <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                        <motion.div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6"
                            initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}>
                            <CheckCircle className="w-12 h-12 text-success" />
                        </motion.div>
                        <h2 className="text-3xl font-black text-gray-dark mb-3">¡Pedido Confirmado!</h2>
                        <p className="text-gray-medium mb-8 text-lg">Tu orden ha sido enviada al local exitosamente.</p>

                        <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 mb-8 max-w-sm mx-auto shadow-sm">
                            <div className="text-sm text-gray-medium font-medium mb-2 uppercase tracking-wider">Número de orden</div>
                            <div className="text-4xl font-black text-primary mb-4">{orderResult.order_number}</div>
                            <div className="text-lg font-bold text-success flex items-center justify-center gap-2 bg-success/10 py-3 rounded-xl">
                                <Star className="w-5 h-5 fill-current" />+{orderResult.points_earned} puntos al retirar
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                            <button onClick={() => router.push('/cliente/orders')} className="flex-1 bg-primary text-white py-4 rounded-xl font-bold shadow-brand hover:bg-primary/90 transition text-lg">Mis Órdenes</button>
                            <button onClick={() => router.push('/cliente/dashboard')} className="flex-1 bg-gray-100 text-gray-dark py-4 rounded-xl font-bold hover:bg-gray-200 transition text-lg">Volver al Inicio</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
