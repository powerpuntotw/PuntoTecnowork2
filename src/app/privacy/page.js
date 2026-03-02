'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Database, UserCheck, Mail, Trash2 } from 'lucide-react';

const Section = ({ icon: Icon, title, children }) => (
    <motion.div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-gray-dark">{title}</h2>
        </div>
        <div className="text-sm text-gray-medium leading-relaxed space-y-2">
            {children}
        </div>
    </motion.div>
);

export default function LegalPrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <motion.div
                    className="flex items-center gap-3 mb-8"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <Link
                        href="/login"
                        className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-medium hover:text-primary hover:border-primary transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-dark">Política de Privacidad</h1>
                        <p className="text-xs text-gray-medium">Última actualización: febrero de 2025</p>
                    </div>
                </motion.div>

                <motion.p
                    className="text-sm text-gray-medium mb-6 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 }}
                >
                    En <strong className="text-gray-dark">Punto Tecnowork</strong> nos tomamos muy en serio tu privacidad.
                    Esta política explica qué datos recopilamos, cómo los usamos y qué derechos tenés sobre ellos.
                    Al usar nuestra aplicación, aceptás los términos descritos a continuación.
                </motion.p>

                <Section icon={Database} title="¿Qué datos recopilamos?">
                    <p>Cuando iniciás sesión con Google obtenemos de forma automática:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                        <li><strong className="text-gray-dark">Correo electrónico</strong> — para identificar tu cuenta de forma única.</li>
                        <li><strong className="text-gray-dark">Nombre completo</strong> — para personalizar tu experiencia.</li>
                        <li><strong className="text-gray-dark">Foto de perfil</strong> — para mostrar tu avatar dentro de la app.</li>
                    </ul>
                    <p className="mt-2">Adicionalmente, podés cargar de forma opcional tu <strong className="text-gray-dark">teléfono</strong> y <strong className="text-gray-dark">DNI</strong> desde tu perfil.</p>
                </Section>

                <Section icon={Eye} title="¿Cómo usamos tus datos?">
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong className="text-gray-dark">Autenticación</strong> — para que puedas ingresar de forma segura.</li>
                        <li><strong className="text-gray-dark">Sistema de puntos</strong> — asociamos tus pedidos y canjes a tu cuenta.</li>
                        <li><strong className="text-gray-dark">Notificaciones</strong> — te avisamos sobre el estado de tus pedidos.</li>
                        <li><strong className="text-gray-dark">Soporte</strong> — si abrís un ticket, usamos tus datos para responderte.</li>
                    </ul>
                </Section>

                <Section icon={Shield} title="¿Compartimos tus datos?">
                    <p>
                        <strong className="text-gray-dark">No vendemos ni compartimos</strong> tus datos personales con terceros.
                        Tus datos permanecen en nuestra base de datos segura alojada en <strong className="text-gray-dark">Supabase</strong> (servidores en Brasil / UE)
                        y solo son accesibles por el personal autorizado de Punto Tecnowork.
                    </p>
                    <p className="mt-2">
                        Google no recibe información adicional más allá del proceso de autenticación OAuth 2.0 estándar.
                    </p>
                </Section>

                <Section icon={UserCheck} title="¿Cuánto tiempo guardamos tus datos?">
                    <p>
                        Tus datos permanecen mientras tu cuenta esté activa. Si solicitás la eliminación de tu cuenta,
                        borraremos todos tus datos personales de identificación de forma permanente.
                        Los registros de pedidos pueden conservarse de forma anonimizada por motivos contables.
                    </p>
                </Section>

                <Section icon={Trash2} title="Tus derechos">
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong className="text-gray-dark">Acceso</strong> — podés ver todos tus datos desde tu perfil.</li>
                        <li><strong className="text-gray-dark">Rectificación</strong> — podés actualizar tu nombre, teléfono y DNI en cualquier momento.</li>
                        <li><strong className="text-gray-dark">Eliminación</strong> — podés solicitar la baja de tu cuenta desde la sección de perfil (siempre que no tengas pedidos ni canjes pendientes).</li>
                    </ul>
                </Section>

                <Section icon={Mail} title="Contacto">
                    <p>
                        ¿Tenés preguntas sobre tu privacidad? Escribinos a través del formulario de soporte dentro de la app
                        o directamente a nuestro local más cercano.
                    </p>
                </Section>

                <p className="text-center text-xs text-gray-medium mt-6">
                    © {new Date().getFullYear()} Punto Tecnowork · Todos los derechos reservados
                </p>
            </div>
        </div>
    );
}
