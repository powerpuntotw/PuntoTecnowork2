'use client';

import { useBrandingCtx } from '../contexts/BrandingContext';

export const DynamicLogo = ({ type = 'principal', className = '', alt = '' }) => {
    const { branding, loading } = useBrandingCtx();

    const urlMap = {
        principal: branding?.logo_principal_url,
        footer1: branding?.logo_footer_1_url,
        footer2: branding?.logo_footer_2_url,
    };

    const logoUrl = urlMap[type];

    if (loading) {
        return <div className={`bg-gray-light rounded animate-pulse ${className}`} />;
    }

    if (!logoUrl) {
        return (
            <div className={`flex items-center justify-center bg-gray-light rounded ${className}`}>
                <span className="text-gray-medium text-xs">—</span>
            </div>
        );
    }

    return (
        <img
            src={logoUrl}
            alt={alt || branding?.app_name || 'Logo'}
            className={className}
            onError={(e) => { e.target.style.display = 'none'; }}
        />
    );
};
