import { createBrowserClient } from '@supabase/ssr';

let _client = null;

export const createClient = () => {
    if (!_client) {
        _client = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
            {
                // Bypass the buggy navigator.locks in Supabase Auth JS.
                // Orphaned WebLocks during React StrictMode remounts cause
                // getSession() and all DB queries to hang indefinitely 
                // waiting for a lock that is never released.
                auth: {
                    lock: (name, acquireTimeout, fn) => {
                        return fn();
                    }
                }
            }
        );
    }
    return _client;
};
