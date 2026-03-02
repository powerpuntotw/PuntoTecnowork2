'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';

const BrandingContext = createContext(null);

export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const { data } = await supabase
                    .from('app_branding')
                    .select('*')
                    .single();
                setBranding(data);
            } catch {
                setBranding(null);
            } finally {
                setLoading(false);
            }
        };
        fetchBranding();
    }, [supabase]);

    return (
        <BrandingContext.Provider value={{ branding, loading }}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBrandingCtx = () => useContext(BrandingContext);
