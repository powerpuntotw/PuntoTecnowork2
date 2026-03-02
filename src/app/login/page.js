'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { DynamicLogo } from '@/components/DynamicLogo';

const ERROR_MESSAGES = {
    'auth_failed': 'Hubo un problema al iniciar sesión. Intentá de nuevo.',
    'session_expired': 'Tu sesión expiró. Por favor, ingresá nuevamente.',
    'access_denied': 'Acceso denegado. Verificá que tu cuenta tiene permisos.',
    'default': 'Error inesperado. Por favor, intentá de nuevo.'
};

function LoginForm() {
    const { signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const searchParams = useSearchParams();

    const errorParam = searchParams.get('error');
    const errorMessage = errorParam
        ? (ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES['default'])
        : null;

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
        } catch (err) {
            console.error('Login error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            className="w-full max-w-sm bg-white rounded-2xl shadow-brand-lg p-8 z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <h1 className="text-2xl font-bold text-gray-dark text-center mb-2">Bienvenido</h1>
            <p className="text-gray-medium text-center text-sm mb-8">Iniciá sesión para continuar</p>

            {errorMessage && (
                <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary text-center">
                    {errorMessage}
                </div>
            )}

            <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-gray-light hover:border-primary hover:shadow-brand transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                {isLoading ? (
                    <motion.div
                        className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                )}
                <span className="font-medium text-gray-dark group-hover:text-primary transition-colors">
                    {isLoading ? 'Redirigiendo...' : 'Continuar con Google'}
                </span>
            </button>

            <p className="text-center text-xs text-gray-medium mt-6 leading-relaxed">
                Al continuar, aceptás nuestros{' '}
                <Link href="/terms" className="text-primary hover:underline font-medium">Términos de Servicio</Link>
                {' '}y nuestra{' '}
                <Link href="/privacy" className="text-primary hover:underline font-medium">Política de Privacidad</Link>.
            </p>
        </motion.div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex flex-col items-center justify-center px-4">
            <DynamicLogo type="principal" className="h-16 mb-10 object-contain z-10" />

            <Suspense fallback={
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-brand-lg p-8 z-10 flex items-center justify-center h-[340px]">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
            }>
                <LoginForm />
            </Suspense>

            <div className="mt-8 flex flex-col items-center gap-2 opacity-60 z-10">
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-medium">Powered by</span>
                    <DynamicLogo type="footer1" className="h-6 object-contain" />
                    <DynamicLogo type="footer2" className="h-6 object-contain" />
                </div>
            </div>

            {/* Background decorations */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[80px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[80px]" />
            </div>
        </div>
    );
}
