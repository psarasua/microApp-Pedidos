// Edge Function "clientes": registro, recuperación y cambio de contraseña.
// Se despliega con verify_jwt desactivado; las acciones que requieren sesión validan el token por su cuenta.
import { createClient } from 'npm:@supabase/supabase-js@2'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const admin = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
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

// El usuario es un ID numérico asignado por el sistema; Supabase Auth pide un email, así que se deriva uno interno
// (debe coincidir con src/lib/supabase.ts).
const emailDe = (usuario: string) => `${usuario}@clientes.invalid`
const MAX_PENDIENTES = 100
const INTENTOS_ID = 10
const MAX_INTENTOS_CODIGO = 5
const BLOQUEO_MINUTOS = 30

// Alfabeto de 32 símbolos sin caracteres confusos (sin 0, O, 1, I): cada byte aleatorio se reparte sin sesgo.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function aleatorio(largo: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(largo))
  return Array.from(bytes, (b) => ALFABETO[b % 32]).join('')
}

/** ID al azar de 6 dígitos (100000 a 999999). */
function nuevoId(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]
  return String(100000 + (n % 900000))
}

/** Código de recuperación de 12 símbolos (60 bits), con formato XXXX-XXXX-XXXX. */
const nuevoCodigo = () => aleatorio(12).match(/.{4}/g)!.join('-')
const normalizarCodigo = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

async function hashCodigo(codigo: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const clave = await crypto.subtle.importKey('raw', enc.encode(codigo), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100_000 }, clave, 256)
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('')
}

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

/** Genera un código nuevo, guarda solo su hash (reinicia los intentos) y devuelve el código para mostrarlo una vez. */
async function guardarCodigo(perfilId: string): Promise<string> {
  const codigo = nuevoCodigo()
  const salt = aleatorio(16)
  const codigo_hash = await hashCodigo(normalizarCodigo(codigo), salt)
  const { error } = await admin
    .from('recuperacion')
    .upsert({ perfil_id: perfilId, codigo_hash, salt, intentos: 0, bloqueado_hasta: null })
  if (error) throw new Error('No se pudo guardar el código de recuperación')
  return codigo
}

type Sesion = { id: string; usuario: string; rol: string; estado: string; debe_cambiar_clave: boolean }

/** Valida el token de la petición y devuelve el perfil de quien la hace. */
async function sesionDe(req: Request): Promise<Sesion | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await admin.auth.getUser(token)
  if (!data.user) return null
  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, usuario, rol, estado, debe_cambiar_clave')
    .eq('id', data.user.id)
    .maybeSingle()
  return (perfil as Sesion | null) ?? null
}

function validarClave(clave: unknown): string | null {
  if (typeof clave !== 'string' || clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (clave.length > 72) return 'La contraseña es demasiado larga'
  return null
}

/** Comprueba la contraseña actual con un cliente propio (no comparte sesión con otras peticiones). */
async function claveActualCorrecta(usuario: string, clave: unknown): Promise<boolean> {
  const cliente = createClient(URL_SUPABASE, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await cliente.auth.signInWithPassword({ email: emailDe(usuario), password: String(clave ?? '') })
  return !error
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

  try {
    // ---- Registro: asigna usuario (ID numérico) y código de recuperación ----
    if (body.accion === 'registrar') {
      const nombre = String(body.nombre ?? '').trim()
      const direccion = String(body.direccion ?? '').trim().slice(0, 200)
      const telefono = String(body.telefono ?? '').replace(/[^\d+ ]/g, '').trim().slice(0, 20)
      if (nombre.length < 2 || nombre.length > 80) return fail('Escribe tu nombre')
      const errClave = validarClave(body.password)
      if (errClave) return fail(errClave)

      const { count } = await admin.from('perfiles').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente')
      if ((count ?? 0) >= MAX_PENDIENTES) return fail('Hay demasiadas solicitudes pendientes. Intenta más tarde.', 429)

      // Se prueba con IDs al azar hasta encontrar uno libre (la unicidad la garantiza el email único de Auth).
      let userId: string | null = null
      let usuario = ''
      for (let i = 0; i < INTENTOS_ID && !userId; i++) {
        usuario = nuevoId()
        const { data: creado, error } = await admin.auth.admin.createUser({
          email: emailDe(usuario),
          password: body.password as string,
          email_confirm: true,
        })
        if (creado?.user) userId = creado.user.id
        else if (!/already|registered|exists/i.test(error?.message ?? '')) return fail('No se pudo crear la cuenta', 500)
      }
      if (!userId) return fail('No se pudo asignar un usuario. Intenta de nuevo.', 500)

      const { error: errPerfil } = await admin.from('perfiles').insert({ id: userId, usuario, nombre, direccion, telefono })
      if (errPerfil) {
        await admin.auth.admin.deleteUser(userId)
        return fail('No se pudo crear la cuenta', 500)
      }
      let codigo: string
      try {
        codigo = await guardarCodigo(userId)
      } catch {
        await admin.auth.admin.deleteUser(userId)
        return fail('No se pudo crear la cuenta', 500)
      }
      return json({ ok: true, usuario, codigo })
    }

    // ---- Olvidé mi contraseña: usuario + código de recuperación + contraseña nueva ----
    if (body.accion === 'recuperar') {
      const usuario = String(body.usuario ?? '').replace(/\D/g, '')
      const codigo = normalizarCodigo(String(body.codigo ?? ''))
      const errClave = validarClave(body.nueva)
      if (errClave) return fail(errClave)
      const GENERICO = 'El usuario o el código de recuperación no son correctos'
      if (!/^[0-9]{5,15}$/.test(usuario) || codigo.length !== 12) return fail(GENERICO, 403)

      const { data: perfil } = await admin.from('perfiles').select('id').eq('usuario', usuario).maybeSingle()
      if (!perfil) return fail(GENERICO, 403)
      const { data: rec } = await admin.from('recuperacion').select('*').eq('perfil_id', perfil.id).maybeSingle()
      if (!rec) return fail(GENERICO, 403)
      if (rec.bloqueado_hasta && new Date(rec.bloqueado_hasta) > new Date())
        return fail('Demasiados intentos. Pide al administrador que restablezca tu contraseña.', 429)

      if (!iguales(await hashCodigo(codigo, rec.salt), rec.codigo_hash)) {
        await admin.rpc('recuperacion_fallo', { p: perfil.id, maximo: MAX_INTENTOS_CODIGO, minutos: BLOQUEO_MINUTOS })
        return fail(GENERICO, 403)
      }

      const { error } = await admin.auth.admin.updateUserById(perfil.id, { password: body.nueva as string })
      if (error) return fail('No se pudo cambiar la contraseña', 500)
      await admin.from('perfiles').update({ debe_cambiar_clave: false }).eq('id', perfil.id)
      // El código usado deja de servir: se entrega uno nuevo.
      return json({ ok: true, codigo: await guardarCodigo(perfil.id) })
    }

    // ---- Cambiar mi contraseña (con sesión). Si el admin la restableció, no pide la actual. ----
    if (body.accion === 'cambiar_clave') {
      const sesion = await sesionDe(req)
      if (!sesion) return fail('Tu sesión venció. Entra de nuevo.', 401)
      const errClave = validarClave(body.nueva)
      if (errClave) return fail(errClave)
      if (!sesion.debe_cambiar_clave && !(await claveActualCorrecta(sesion.usuario, body.actual)))
        return fail('La contraseña actual no es correcta', 403)

      // Ojo: cambiar la contraseña cierra las sesiones abiertas; la app vuelve a entrar con la nueva.
      const { error } = await admin.auth.admin.updateUserById(sesion.id, { password: body.nueva as string })
      if (error) return fail('No se pudo cambiar la contraseña', 500)
      if (!sesion.debe_cambiar_clave) return json({ ok: true })
      await admin.from('perfiles').update({ debe_cambiar_clave: false }).eq('id', sesion.id)
      return json({ ok: true, codigo: await guardarCodigo(sesion.id) })
    }

    // ---- Generar un código de recuperación nuevo (con sesión y contraseña actual) ----
    if (body.accion === 'nuevo_codigo') {
      const sesion = await sesionDe(req)
      if (!sesion) return fail('Tu sesión venció. Entra de nuevo.', 401)
      if (!(await claveActualCorrecta(sesion.usuario, body.actual))) return fail('La contraseña actual no es correcta', 403)
      return json({ ok: true, codigo: await guardarCodigo(sesion.id) })
    }

    // ---- Admin: restablecer la contraseña de un cliente con una temporal ----
    if (body.accion === 'restablecer_clave') {
      const sesion = await sesionDe(req)
      if (!sesion || sesion.rol !== 'admin' || sesion.estado !== 'aprobado') return fail('No autorizado', 403)
      const id = String(body.id ?? '')
      const { data: objetivo } = await admin.from('perfiles').select('id').eq('id', id).maybeSingle()
      if (!objetivo) return fail('No se encontró al cliente', 404)
      const temporal = aleatorio(10)
      const { error } = await admin.auth.admin.updateUserById(id, { password: temporal })
      if (error) return fail('No se pudo cambiar la contraseña', 500)
      await admin.from('perfiles').update({ debe_cambiar_clave: true }).eq('id', id)
      return json({ ok: true, temporal })
    }

    return fail('Acción desconocida')
  } catch (e) {
    console.error(e)
    return fail('Ocurrió un error. Intenta de nuevo.', 500)
  }
})
