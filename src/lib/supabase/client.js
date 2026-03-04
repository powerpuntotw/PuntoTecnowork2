import { createBrowserClient } from '@supabase/ssr';

let _client = null;

export const createClient = () => {
    if (!_client) {
        _client = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
        );
    }
    return _client;
};
