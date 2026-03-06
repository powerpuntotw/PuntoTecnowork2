'use client';

import { useEffect, useRef } from 'react';

/**
 * SessionRecovery
 *
 * Detects when a browser tab returns from being hidden/inactive
 * for an extended period. On mobile, the Supabase auth session
 * can become stale after the tab is backgrounded, causing a
 * permanent blank screen. This component forces a soft page
 * reload to re-initialize the auth state cleanly.
 *
 * Place this inside AuthProvider at the root layout level.
 */
const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function SessionRecovery() {
    const hiddenAtRef = useRef(null);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAtRef.current = Date.now();
            } else if (document.visibilityState === 'visible' && hiddenAtRef.current) {
                const elapsed = Date.now() - hiddenAtRef.current;
                hiddenAtRef.current = null;

                if (elapsed > INACTIVITY_THRESHOLD_MS) {
                    // Session likely stale — reload to re-initialize auth
                    window.location.reload();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return null;
}
