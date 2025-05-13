// @ts-nocheck
// deno-lint-ignore-file

import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

serve(async (req) => {
    if (req.method !== 'POST')
        return new Response('Method Not Allowed', { status: 405 });

    try {
        const { userId } = await req.json();
        if (!userId) return new Response('userId required', { status: 400 });

        // ------------------------------------------------------------------
        //  1. Récupère l’identité de l’appelant à partir du JWT transmis
        // ------------------------------------------------------------------
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const jwt = (req.headers.get('authorization') ?? '').replace('Bearer ', '');

        const authClient = createClient(supabaseUrl, serviceKey, {
            global: { headers: { Authorization: `Bearer ${jwt}` } },
        });

        const { data: { user }, error: authErr } = await authClient.auth.getUser();
        if (authErr || !user) return new Response('Unauthorized', { status: 401 });

        if (user.id !== userId)
            return new Response('Forbidden – cannot delete another user', { status: 403 });

        // ------------------------------------------------------------------
        //  2. Suppression définitive du compte (cascade sur profile & data)
        // ------------------------------------------------------------------
        const admin = createClient(supabaseUrl, serviceKey);
        const { error } = await admin.auth.admin.deleteUser(userId, true); // hard delete
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (e) {
        return new Response((e as Error).message, { status: 500 });
    }
});
