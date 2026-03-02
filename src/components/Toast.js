'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext({});

const TOAST_COLORS = {
    success: { bg: 'bg-success', icon: CheckCircle },
    error: { bg: 'bg-primary', icon: XCircle },
    info: { bg: 'bg-secondary', icon: Info },
    warning: { bg: 'bg-accent', icon: AlertTriangle }
};

const Toast = ({ toast, onClose }) => {
    const { bg, icon: Icon } = TOAST_COLORS[toast.type] || TOAST_COLORS.info;

    return (
        <motion.div
            className={`${bg} text-white rounded-xl shadow-brand-lg p-4 flex items-center gap-3 w-[400px] max-w-[90vw] pointer-events-auto`}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            layout
        >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1 text-sm">{toast.message}</p>
            <button onClick={() => onClose(toast.id)} className="flex-shrink-0">
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <Toast key={toast.id} toast={toast} onClose={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
