// Edge Function "ping": hace una consulta mínima a la base para que Supabase no pause el proyecto por inactividad
// (los proyectos gratis se pausan tras 7 días sin uso). La llama la tarea programada de GitHub Actions cada 2 días
// (.github/workflows/mantener-activo.yml). No recibe datos ni devuelve datos: solo {"ok": true|false}.
// Se despliega con verify_jwt desactivado.
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return new Response('Método no permitido', { status: 405 })
  const { error } = await admin.from('categorias').select('id', { head: true, count: 'exact' }).limit(1)
  return new Response(JSON.stringify({ ok: !error }), {
    status: error ? 503 : 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
})
