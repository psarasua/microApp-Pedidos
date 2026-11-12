// Edge Function "clientes": registro de clientes y cambio de contraseña por el admin.
// Se despliega con verify_jwt desactivado; la acción de admin valida el token por su cuenta.
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const fail = (message: string, status = 400) => json({ error: message }, status)

// El usuario es el celular; Supabase Auth pide un email, así que se deriva uno interno (debe coincidir con src/lib/supabase.ts).
const emailDe = (usuario: string) => `${usuario}@clientes.invalid`
const MAX_PENDIENTES = 100

async function esAdmin(req: Request): Promise<boolean> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return false
  const { data } = await admin.auth.getUser(token)
  if (!data.user) return false
  const { data: perfil } = await admin.from('perfiles').select('rol, estado').eq('id', data.user.id).maybeSingle()
  return perfil?.rol === 'admin' && perfil?.estado === 'aprobado'
}

function validarClave(clave: unknown): string | null {
  if (typeof clave !== 'string' || clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (clave.length > 72) return 'La contraseña es demasiado larga'
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return fail('Método no permitido', 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return fail('Solicitud inválida')
  }

  if (body.accion === 'registrar') {
    const usuario = String(body.usuario ?? '').replace(/\D/g, '')
    const nombre = String(body.nombre ?? '').trim()
    const direccion = String(body.direccion ?? '').trim().slice(0, 200)
    if (!/^[0-9]{8,15}$/.test(usuario)) return fail('El número debe tener entre 8 y 15 dígitos')
    if (nombre.length < 2 || nombre.length > 80) return fail('Escribe tu nombre')
    const errClave = validarClave(body.password)
    if (errClave) return fail(errClave)

    const { count } = await admin.from('perfiles').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente')
    if ((count ?? 0) >= MAX_PENDIENTES) return fail('Hay demasiadas solicitudes pendientes. Intenta más tarde.', 429)

    const { data: creado, error } = await admin.auth.admin.createUser({
      email: emailDe(usuario),
      password: body.password as string,
      email_confirm: true,
    })
    if (error || !creado.user) {
      const repetido = /already|registered|exists/i.test(error?.message ?? '')
      return fail(repetido ? 'Ese número ya está registrado' : 'No se pudo crear la cuenta', repetido ? 409 : 500)
    }
    const { error: errPerfil } = await admin.from('perfiles').insert({ id: creado.user.id, usuario, nombre, direccion })
    if (errPerfil) {
      await admin.auth.admin.deleteUser(creado.user.id)
      return fail('No se pudo crear la cuenta', 500)
    }
    return json({ ok: true })
  }

  if (body.accion === 'restablecer_clave') {
    if (!(await esAdmin(req))) return fail('No autorizado', 403)
    const errClave = validarClave(body.password)
    if (errClave) return fail(errClave)
    const id = String(body.id ?? '')
    const { error } = await admin.auth.admin.updateUserById(id, { password: body.password as string })
    if (error) return fail('No se pudo cambiar la contraseña', 500)
    return json({ ok: true })
  }

  return fail('Acción desconocida')
})
