'use client';

import { DynamicLogo } from './DynamicLogo';

export const Footer = () => {
    return (
        <footer className="py-4 px-6 border-t border-gray-200 bg-white">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <span className="text-xs text-gray-medium font-medium">
                    Desarrollado por <span className="font-bold text-gray-dark">Luis Mereles</span>
                </span>
                <div className="flex items-center gap-4 border-l pl-4 border-gray-200">
                    <DynamicLogo type="footer1" className="h-6 object-contain" />
                    <DynamicLogo type="footer2" className="h-6 object-contain" />
                </div>
            </div>
        </footer>
    );
};
