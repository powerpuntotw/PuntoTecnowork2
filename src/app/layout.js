import './globals.css';
import { Inter } from "next/font/google";
import { AuthProvider } from '@/contexts/AuthContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { ToastProvider } from '@/components/Toast';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { SessionRecovery } from '@/components/SessionRecovery';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Punto Tecnowork",
    description: "App de Fidelización y Servicios",
};

export default function RootLayout({ children }) {
    return (
        <html lang="es" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{
                    __html: `
                        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                            document.documentElement.classList.add('dark');
                        } else {
                            document.documentElement.classList.remove('dark');
                        }
                    `
                }} />
            </head>
            <body className={`${inter.className} min-h-screen bg-white dark:bg-gray-dark text-gray-dark dark:text-gray-100 transition-colors duration-300 font-sans`}>
                <GlobalErrorBoundary>
                    <AuthProvider>
                        <SessionRecovery />
                        <BrandingProvider>
                            <ToastProvider>
                                {children}
                            </ToastProvider>
                        </BrandingProvider>
                    </AuthProvider>
                </GlobalErrorBoundary>
            </body>
        </html>
    );
}
