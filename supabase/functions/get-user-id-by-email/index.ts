// Edge Function Supabase : résolution email → user_id (RGPD)
// Déploiement : supabase functions deploy get-user-id-by-email
// Utilise la clé service_role (SUPABASE_SERVICE_ROLE_KEY) pour lister les users.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    let email: string
    try {
        const body = await req.json() as { email?: string }
        email = typeof body?.email === 'string' ? body.email.trim() : ''
    } catch {
        return new Response(JSON.stringify({ error: 'Body JSON invalide' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    if (!email) {
        return new Response(JSON.stringify({ error: 'email requis' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
        return new Response(JSON.stringify({ error: 'Configuration Supabase manquante' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }
        const found = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
        if (!found) {
            return new Response(JSON.stringify({ error: 'Aucun utilisateur trouvé pour cet email' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }
        return new Response(JSON.stringify({ user_id: found.id }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (err) {
        console.error(err)
        return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
