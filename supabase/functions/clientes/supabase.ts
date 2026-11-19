// Clientes de Supabase de la función: el de servicio (salta RLS; solo se usa aquí, nunca en el navegador).
import { createClient } from 'npm:@supabase/supabase-js@2'

export const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
export const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
export const admin = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
