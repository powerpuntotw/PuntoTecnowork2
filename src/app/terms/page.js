'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, FileText, Star, AlertTriangle, Ban, Scale, RefreshCcw } from 'lucide-react';

const Section = ({ icon: Icon, title, children }) => (
    <motion.div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-lg font-bold text-gray-dark">{title}</h2>
        </div>
        <div className="text-sm text-gray-medium leading-relaxed space-y-2">
            {children}
        </div>
    </motion.div>
);

export default function LegalTermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-white to-primary/5 px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <motion.div
                    className="flex items-center gap-3 mb-8"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <Link
                        href="/login"
                        className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-medium hover:text-secondary hover:border-secondary transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-dark">Términos de Servicio</h1>
                        <p className="text-xs text-gray-medium">Última actualización: febrero de 2025</p>
                    </div>
                </motion.div>

                <motion.p
                    className="text-sm text-gray-medium mb-6 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 }}
                >
                    Al usar la aplicación <strong className="text-gray-dark">Punto Tecnowork</strong> aceptás estos Términos de Servicio en su totalidad.
                    Por favor, leelos con atención antes de utilizar el servicio.
                </motion.p>

                <Section icon={FileText} title="1. El Servicio">
                    <p>
                        Punto Tecnowork es una plataforma de gestión de impresión y fidelización de clientes.
                        Permite a usuarios registrados cargar archivos para imprimir, acumular puntos por sus compras
                        y canjear premios en locales habilitados.
                    </p>
                    <p className="mt-2">
                        El acceso se realiza exclusivamente mediante <strong className="text-gray-dark">cuenta de Google</strong>.
                        Para usar el servicio debés tener al menos 13 años de edad.
                    </p>
                </Section>

                <Section icon={Star} title="2. Sistema de Puntos y Premios">
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Los puntos se acreditan automáticamente al completarse un pedido de impresión.</li>
                        <li>Los puntos <strong className="text-gray-dark">no tienen valor monetario</strong> y no son canjeables por dinero en efectivo.</li>
                        <li>Los puntos pueden <strong className="text-gray-dark">expirar o ajustarse</strong> a criterio de Punto Tecnowork.</li>
                        <li>Los premios canjeados están sujetos a disponibilidad de stock en el local elegido.</li>
                        <li>Un canje realizado <strong className="text-gray-dark">no puede revertirse</strong> una vez retirado.</li>
                    </ul>
                </Section>

                <Section icon={Ban} title="3. Uso Aceptable">
                    <p>Queda <strong className="text-gray-dark">estrictamente prohibido</strong>:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
                        <li>Cargar archivos con contenido ilegal, violento, o que infrinja derechos de autor.</li>
                        <li>Intentar acceder a cuentas de otros usuarios.</li>
                        <li>Usar herramientas automatizadas para manipular puntos o pedidos.</li>
                        <li>Suplantar la identidad de otra persona.</li>
                    </ul>
                    <p className="mt-2">
                        El incumplimiento puede resultar en la suspensión permanente de la cuenta, sin derecho a devolución de puntos.
                    </p>
                </Section>

                <Section icon={AlertTriangle} title="4. Limitación de Responsabilidad">
                    <p>Punto Tecnowork <strong className="text-gray-dark">no se responsabiliza</strong> por:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
                        <li>Pérdida de archivos cargados en la plataforma una vez procesado el pedido.</li>
                        <li>Demoras en la impresión ocasionadas por el local.</li>
                        <li>Interrupciones temporales del servicio por mantenimiento.</li>
                        <li>Daños derivados del uso indebido del servicio.</li>
                    </ul>
                </Section>

                <Section icon={RefreshCcw} title="5. Modificaciones">
                    <p>
                        Nos reservamos el derecho de modificar estos términos en cualquier momento.
                        Los cambios serán comunicados a través de la aplicación. Continuar usando el servicio
                        luego de una actualización implica la aceptación de los nuevos términos.
                    </p>
                </Section>

                <Section icon={Scale} title="6. Ley Aplicable">
                    <p>
                        Estos términos se rigen por las leyes de la <strong className="text-gray-dark">República Argentina</strong>.
                        Cualquier disputa será resuelta ante los tribunales ordinarios competentes de la ciudad de Buenos Aires.
                    </p>
                </Section>

                <p className="text-center text-xs text-gray-medium mt-6">
                    © {new Date().getFullYear()} Punto Tecnowork · Todos los derechos reservados
                </p>
            </div>
        </div>
    );
}
