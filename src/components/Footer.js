'use client';

import { DynamicLogo } from './DynamicLogo';

export const Footer = () => {
    return (
        <footer className="py-4 px-6 border-t border-gray-200 bg-white">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <span className="text-xs text-gray-medium">Powered by</span>
                <div className="flex items-center gap-4">
                    <DynamicLogo type="footer1" className="h-8 object-contain" />
                    <DynamicLogo type="footer2" className="h-8 object-contain" />
                </div>
            </div>
        </footer>
    );
};
