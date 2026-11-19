// Edge Function "clientes": registro con verificación por correo, recuperación de usuario y contraseña,
// y gestión de contraseñas. Se despliega con verify_jwt desactivado; las acciones que requieren sesión
// validan el token por su cuenta.
//
// Correo: se envía con Brevo (https://www.brevo.com). Secretos de la función:
//   BREVO_API_KEY        clave de API v3 de Brevo
//   BREVO_SENDER_EMAIL   remitente verificado en Brevo
//   BREVO_SENDER_NAME    (opcional) nombre del remitente, por defecto "Pedidos"
//   CORREO_SIMULADO=1    (solo pruebas) no envía: escribe el correo en los registros de la función
//   ALLOWED_ORIGINS      (opcional) orígenes del navegador permitidos, separados por comas
import { createClient } from 'npm:@supabase/supabase-js@2'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const admin = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// CORS: con ALLOWED_ORIGINS (lista separada por comas, p. ej. "https://pedidos.vercel.app") solo esos orígenes pueden llamar
// desde un navegador; sin ese secreto se permite cualquiera (la seguridad real está en los tokens y los límites).
const ORIGENES = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

function corsPara(req: Request): Record<string, string> {
  const origen = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ORIGENES.length === 0 ? '*' : ORIGENES.includes(origen) ? origen : ORIGENES[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const fail = (message: string, status = 400) => json({ error: message }, status)

// El usuario es un ID numérico asignado por el sistema; Supabase Auth pide un email, así que se deriva uno interno
// (debe coincidir con src/lib/supabase.ts). El correo real del cliente se guarda en perfiles.email.
const emailDe = (usuario: string) => `${usuario}@clientes.invalid`

// ---- Límites de seguridad ----
const MAX_PENDIENTES = 100 // cuentas verificadas esperando aprobación
const INTENTOS_ID = 10
const CODIGO_VENCE_MIN = 15 // minutos de vida de un código
const CODIGO_INTENTOS = 5 // intentos por código
const ESPERA_SEG = 60 // espera mínima entre dos correos al mismo destino
const ENVIOS_CORREO_HORA = 3 // correos por dirección y por hora
const ENVIOS_IP_HORA = 10 // correos por conexión y por hora
const REGISTROS_IP_HORA = 5 // registros por conexión y por hora
const ENVIOS_GLOBAL_DIA = 250 // tope diario (el plan gratis de Brevo permite 300)
const SIN_VERIFICAR_HORAS = 24 // las cuentas sin verificar se borran pasado este tiempo

// Alfabeto de 32 símbolos sin caracteres confusos (sin 0, O, 1, I): cada byte aleatorio se reparte sin sesgo.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function aleatorio(largo: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(largo))
  return Array.from(bytes, (b) => ALFABETO[b % 32]).join('')
}

const entre = (min: number, max: number) => min + (crypto.getRandomValues(new Uint32Array(1))[0] % (max - min + 1))
const nuevoId = () => String(entre(100000, 999999)) // ID de usuario: 6 dígitos
const nuevoCodigo = () => String(entre(100000, 999999)) // código de verificación: 6 dígitos

async function sha256(texto: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

const hace = (minutos: number) => new Date(Date.now() - minutos * 60_000).toISOString()
const limpiarCorreo = (v: unknown) => String(v ?? '').trim().toLowerCase()
const esCorreo = (s: string) => s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)

async function huellaIp(req: Request): Promise<string> {
  const ip = (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  return sha256(`ip:${ip || 'desconocida'}`)
}

// ---- Correo ----
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

type Mensaje = { html: string; texto: string }

function plantilla(titulo: string, lineas: string[], destacado?: string): Mensaje {
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#14213d">
<h2 style="margin:0 0 16px">${esc(titulo)}</h2>
${lineas.map((l) => `<p style="margin:0 0 12px;line-height:1.5">${esc(l)}</p>`).join('\n')}
${destacado ? `<p style="margin:20px 0;padding:14px;background:#ffd93d;border-radius:8px;text-align:center;font-size:30px;font-weight:bold;letter-spacing:6px">${esc(destacado)}</p>` : ''}
</div>`
  const texto = [titulo, '', ...lineas, ...(destacado ? ['', destacado] : [])].join('\n')
  return { html, texto }
}

async function enviarCorreo(para: string, asunto: string, msg: Mensaje): Promise<void> {
  if (Deno.env.get('CORREO_SIMULADO') === '1') {
    console.log(`[correo simulado] para=${para} asunto=${asunto}\n${msg.texto}`)
    return
  }
  const clave = Deno.env.get('BREVO_API_KEY')
  const remitente = Deno.env.get('BREVO_SENDER_EMAIL')
  if (!clave || !remitente) throw new Error('El correo no está configurado (faltan BREVO_API_KEY o BREVO_SENDER_EMAIL)')
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': clave, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: Deno.env.get('BREVO_SENDER_NAME') ?? 'Pedidos', email: remitente },
      to: [{ email: para }],
      subject: asunto,
      htmlContent: msg.html,
      textContent: msg.texto,
    }),
  })
  if (!res.ok) throw new Error(`Brevo respondió ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

// ---- Registro de envíos y límites ----
const envios = () => admin.from('envios_correo')

/** Devuelve el motivo si no se puede enviar otro correo a esta clave (correo o identificador) desde esta conexión. */
async function limiteEnvios(clave: string, ip: string): Promise<string | null> {
  const contar = () => envios().select('id', { count: 'exact', head: true })
  const [porCorreo, ultimo, porIp, global] = await Promise.all([
    contar().eq('email', clave).gte('created_at', hace(60)),
    envios().select('created_at').eq('email', clave).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    contar().eq('ip_hash', ip).gte('created_at', hace(60)),
    contar().eq('enviado', true).gte('created_at', hace(1440)),
  ])
  if ((global.count ?? 0) >= ENVIOS_GLOBAL_DIA) return 'El envío de correos está saturado por hoy. Intenta mañana o pide ayuda al administrador.'
  if (ultimo.data && Date.now() - new Date(ultimo.data.created_at).getTime() < ESPERA_SEG * 1000)
    return 'Espera un minuto antes de pedir otro correo.'
  if ((porCorreo.count ?? 0) >= ENVIOS_CORREO_HORA) return 'Pediste demasiados correos. Intenta de nuevo en una hora.'
  if ((porIp.count ?? 0) >= ENVIOS_IP_HORA) return 'Demasiados intentos desde tu conexión. Intenta de nuevo en una hora.'
  return null
}

async function anotarEnvio(d: { email: string; ip: string; tipo: string; perfilId?: string | null; codigo?: string }): Promise<string> {
  const salt = d.codigo ? aleatorio(16) : null
  const { data, error } = await envios()
    .insert({
      email: d.email,
      perfil_id: d.perfilId ?? null,
      tipo: d.tipo,
      codigo_hash: d.codigo ? await sha256(`${salt}:${d.codigo}`) : null,
      salt,
      expira: d.codigo ? new Date(Date.now() + CODIGO_VENCE_MIN * 60_000).toISOString() : null,
      ip_hash: d.ip,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error('No se pudo registrar el envío')
  return data.id
}

/** Genera un código, lo guarda (solo su hash) y lo envía por correo. */
async function enviarCodigo(o: { tipo: 'registro' | 'recuperacion'; email: string; perfilId: string; ip: string; nombre: string }) {
  const codigo = nuevoCodigo()
  const id = await anotarEnvio({ ...o, codigo })
  const registro = o.tipo === 'registro'
  const msg = plantilla(
    registro ? 'Verifica tu correo' : 'Cambia tu contraseña',
    [
      `Hola ${o.nombre},`,
      registro
        ? 'Este es tu código para verificar tu correo y terminar de crear tu cuenta. Vence en 15 minutos.'
        : 'Este es tu código para elegir una contraseña nueva. Vence en 15 minutos.',
      'Si no lo pediste tú, ignora este mensaje: sin el código nadie puede entrar a tu cuenta.',
    ],
    codigo,
  )
  await enviarCorreo(o.email, `${codigo} es tu código ${registro ? 'de verificación' : 'para cambiar la contraseña'}`, msg)
  await envios().update({ enviado: true }).eq('id', id)
}

/** Aviso informativo (sin código). Un fallo al enviarlo no interrumpe la operación. */
async function enviarAviso(email: string, ip: string, perfilId: string | null, asunto: string, msg: Mensaje) {
  try {
    const id = await anotarEnvio({ email, ip, tipo: 'aviso', perfilId })
    await enviarCorreo(email, asunto, msg)
    await envios().update({ enviado: true }).eq('id', id)
  } catch (e) {
    console.error('No se pudo enviar el aviso:', e instanceof Error ? e.message : e)
  }
}

type Veredicto = { ok: true } | { ok: false; res: Response }

/** Comprueba el último código vigente de esa clave y tipo. Cuenta cada intento y lo gasta si es correcto. */
async function validarCodigo(clave: string, tipo: 'registro' | 'recuperacion', codigo: string): Promise<Veredicto> {
  const { data: fila } = await envios()
    .select('id, salt, codigo_hash')
    .eq('email', clave)
    .eq('tipo', tipo)
    .eq('usado', false)
    .eq('enviado', true)
    .gt('expira', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!fila) return { ok: false, res: fail('El código venció o no existe. Pide uno nuevo.', 400) }
  const { data: intentos } = await admin.rpc('codigo_intento', { p: fila.id })
  if ((intentos ?? CODIGO_INTENTOS + 1) > CODIGO_INTENTOS) return { ok: false, res: fail('Demasiados intentos con este código. Pide uno nuevo.', 429) }
  if (!iguales(await sha256(`${fila.salt}:${codigo}`), fila.codigo_hash)) return { ok: false, res: fail('El código no es correcto.', 400) }
  const { data: gastado } = await envios().update({ usado: true }).eq('id', fila.id).eq('usado', false).select('id')
  if (!gastado?.length) return { ok: false, res: fail('El código ya se usó. Pide uno nuevo.', 400) }
  return { ok: true }
}

const soloCodigo = (v: unknown) => String(v ?? '').replace(/\D/g, '')

// ---- Perfiles ----
type PerfilCorreo = { id: string; usuario: string; nombre: string; email: string }

/** Busca por usuario (ID) o por correo; solo cuentas con correo verificado. */
async function buscarPerfil(identificador: string): Promise<PerfilCorreo | null> {
  const v = identificador.trim().toLowerCase()
  let consulta = admin.from('perfiles').select('id, usuario, nombre, email, email_verificado')
  if (v.includes('@')) consulta = consulta.eq('email', v)
  else {
    const digitos = v.replace(/\D/g, '')
    if (!/^[0-9]{5,15}$/.test(digitos)) return null
    consulta = consulta.eq('usuario', digitos)
  }
  const { data } = await consulta.maybeSingle()
  return data?.email && data.email_verificado ? (data as PerfilCorreo) : null
}

/** Borra las cuentas que nunca verificaron su correo y los registros de envío viejos. */
async function limpiar() {
  const { data } = await admin
    .from('perfiles')
    .select('id')
    .eq('email_verificado', false)
    .eq('rol', 'cliente')
    .not('email', 'is', null)
    .lt('created_at', hace(SIN_VERIFICAR_HORAS * 60))
    .limit(20)
  for (const p of data ?? []) await admin.auth.admin.deleteUser(p.id)
  await envios().delete().lt('created_at', hace(7 * 1440))
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

const NO_ENVIADO = 'No pudimos enviar el correo. Revisa la dirección e intenta de nuevo.'

async function manejar(req: Request): Promise<Response> {
  if (req.method !== 'POST') return fail('Método no permitido', 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return fail('Solicitud inválida')
  }

  try {
    // ---- Registro: crea la cuenta sin verificar y envía el código al correo ----
    if (body.accion === 'registrar') {
      // El registro pide solo correo y contraseña: el nombre del cliente lo asigna después el admin (perfiles.nombre_cliente).
      const email = limpiarCorreo(body.email)
      if (!esCorreo(email)) return fail('Escribe un correo válido')
      const errClave = validarClave(body.password)
      if (errClave) return fail(errClave)

      const ip = await huellaIp(req)
      const { count: registros } = await envios()
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ip)
        .eq('tipo', 'registro')
        .gte('created_at', hace(60))
      if ((registros ?? 0) >= REGISTROS_IP_HORA) return fail('Demasiados registros desde tu conexión. Intenta de nuevo en una hora.', 429)

      await limpiar()
      const { data: existente } = await admin.from('perfiles').select('id, email_verificado').eq('email', email).maybeSingle()
      if (existente?.email_verificado) return fail('Ese correo ya tiene una cuenta. Si es tuyo, usa «Olvidé mi contraseña».', 409)

      const limite = await limiteEnvios(email, ip)
      if (limite) return fail(limite, 429)
      const { count: pendientes } = await admin
        .from('perfiles')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
        .eq('email_verificado', true)
      if ((pendientes ?? 0) >= MAX_PENDIENTES) return fail('Hay demasiadas solicitudes pendientes. Intenta más tarde.', 429)

      // Un registro anterior sin verificar con este correo se reemplaza por el nuevo.
      if (existente) await admin.auth.admin.deleteUser(existente.id)

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

      const nombre = `Cliente ${usuario}` // provisorio hasta que el admin asigne el nombre del cliente
      const { error: errPerfil } = await admin
        .from('perfiles')
        .insert({ id: userId, usuario, nombre, email, email_verificado: false })
      if (errPerfil) {
        await admin.auth.admin.deleteUser(userId)
        return fail('No se pudo crear la cuenta', 500)
      }
      try {
        await enviarCodigo({ tipo: 'registro', email, perfilId: userId, ip, nombre })
      } catch (e) {
        console.error('registrar: no se pudo enviar el código:', e instanceof Error ? e.message : e)
        await admin.auth.admin.deleteUser(userId)
        return fail(NO_ENVIADO, 502)
      }
      return json({ ok: true })
    }

    // ---- Verificar el correo con el código; devuelve el usuario (ID) y lo envía también por correo ----
    if (body.accion === 'verificar_correo') {
      const email = limpiarCorreo(body.email)
      const codigo = soloCodigo(body.codigo)
      if (codigo.length !== 6) return fail('El código tiene 6 dígitos.')
      const { data: perfil } = await admin.from('perfiles').select('id, usuario, nombre, email_verificado').eq('email', email).maybeSingle()
      if (!perfil || perfil.email_verificado) return fail('El código venció o no existe. Pide uno nuevo.', 400)
      const v = await validarCodigo(email, 'registro', codigo)
      if (!v.ok) return v.res
      await admin.from('perfiles').update({ email_verificado: true }).eq('id', perfil.id)
      await enviarAviso(
        email,
        await huellaIp(req),
        perfil.id,
        'Tu cuenta fue creada',
        plantilla(
          'Tu cuenta fue creada',
          [
            `Hola ${perfil.nombre},`,
            'Este es tu usuario. Guárdalo: lo necesitas para entrar, junto con la contraseña que elegiste.',
            'Tu cuenta será revisada por el administrador. Cuando la apruebe vas a poder hacer pedidos.',
          ],
          perfil.usuario,
        ),
      )
      return json({ ok: true, usuario: perfil.usuario })
    }

    // ---- Reenviar el código de verificación ----
    if (body.accion === 'reenviar_codigo') {
      const email = limpiarCorreo(body.email)
      const ip = await huellaIp(req)
      const limite = await limiteEnvios(email, ip)
      if (limite) return fail(limite, 429)
      const { data: perfil } = await admin.from('perfiles').select('id, nombre, email_verificado').eq('email', email).maybeSingle()
      if (perfil && !perfil.email_verificado) {
        try {
          await enviarCodigo({ tipo: 'registro', email, perfilId: perfil.id, ip, nombre: perfil.nombre })
        } catch (e) {
          console.error('reenviar_codigo:', e instanceof Error ? e.message : e)
          return fail(NO_ENVIADO, 502)
        }
      } else await anotarEnvio({ email, ip, tipo: 'registro' }) // misma respuesta exista o no la cuenta
      return json({ ok: true })
    }

    // ---- Olvidé mi contraseña, paso 1: se envía un código al correo de la cuenta ----
    if (body.accion === 'recuperar_pedir') {
      const identificador = String(body.identificador ?? '').slice(0, 254)
      const ip = await huellaIp(req)
      const perfil = await buscarPerfil(identificador)
      // La respuesta es la misma exista o no la cuenta, para no revelar quién tiene una.
      const clave = perfil?.email ?? `sin:${identificador.trim().toLowerCase()}`
      const limite = await limiteEnvios(clave, ip)
      if (limite) return fail(limite, 429)
      if (perfil) {
        try {
          await enviarCodigo({ tipo: 'recuperacion', email: perfil.email, perfilId: perfil.id, ip, nombre: perfil.nombre })
        } catch (e) {
          console.error('recuperar_pedir:', e instanceof Error ? e.message : e)
          return fail(NO_ENVIADO, 502)
        }
      } else await anotarEnvio({ email: clave, ip, tipo: 'recuperacion' })
      return json({ ok: true })
    }

    // ---- Olvidé mi contraseña, paso 2: con el código correcto se elige la contraseña nueva ----
    if (body.accion === 'recuperar_confirmar') {
      const identificador = String(body.identificador ?? '').slice(0, 254)
      const codigo = soloCodigo(body.codigo)
      if (codigo.length !== 6) return fail('El código tiene 6 dígitos.')
      const errClave = validarClave(body.nueva)
      if (errClave) return fail(errClave)
      const perfil = await buscarPerfil(identificador)
      const clave = perfil?.email ?? `sin:${identificador.trim().toLowerCase()}`
      const v = await validarCodigo(clave, 'recuperacion', codigo)
      if (!v.ok) return v.res
      if (!perfil) return fail('El código venció o no existe. Pide uno nuevo.', 400)

      const { error } = await admin.auth.admin.updateUserById(perfil.id, { password: body.nueva as string })
      if (error) return fail('No se pudo cambiar la contraseña', 500)
      await admin.from('perfiles').update({ debe_cambiar_clave: false }).eq('id', perfil.id)
      await envios().update({ usado: true }).eq('email', perfil.email).eq('tipo', 'recuperacion').eq('usado', false)
      await enviarAviso(
        perfil.email,
        await huellaIp(req),
        perfil.id,
        'Se cambió tu contraseña',
        plantilla('Se cambió tu contraseña', [
          `Hola ${perfil.nombre},`,
          'La contraseña de tu cuenta se acaba de cambiar. Si no fuiste tú, avisa al administrador cuanto antes.',
        ]),
      )
      return json({ ok: true, usuario: perfil.usuario })
    }

    // ---- Olvidé mi usuario: se envía el ID al correo ----
    if (body.accion === 'olvide_usuario') {
      const email = limpiarCorreo(body.email)
      const ip = await huellaIp(req)
      const limite = await limiteEnvios(email, ip)
      if (limite) return fail(limite, 429)
      const perfil = email.includes('@') ? await buscarPerfil(email) : null
      if (perfil) {
        try {
          const id = await anotarEnvio({ email, ip, tipo: 'usuario', perfilId: perfil.id })
          await enviarCorreo(
            email,
            'Tu usuario',
            plantilla('Tu usuario', [`Hola ${perfil.nombre},`, 'Este es tu usuario para entrar:'], perfil.usuario),
          )
          await envios().update({ enviado: true }).eq('id', id)
        } catch (e) {
          console.error('olvide_usuario:', e instanceof Error ? e.message : e)
          return fail(NO_ENVIADO, 502)
        }
      } else await anotarEnvio({ email: email || 'sin:vacio', ip, tipo: 'usuario' })
      return json({ ok: true })
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
      if (sesion.debe_cambiar_clave) await admin.from('perfiles').update({ debe_cambiar_clave: false }).eq('id', sesion.id)
      return json({ ok: true })
    }

    // ---- Admin: restablecer la contraseña de un cliente con una temporal ----
    if (body.accion === 'restablecer_clave') {
      const sesion = await sesionDe(req)
      if (!sesion || sesion.rol !== 'admin' || sesion.estado !== 'aprobado') return fail('No autorizado', 403)
      const id = String(body.id ?? '')
      // Solo clientes: un administrador que olvida su contraseña la recupera por correo (así nadie toma la cuenta de otro admin).
      const { data: objetivo } = await admin.from('perfiles').select('id, rol').eq('id', id).maybeSingle()
      if (!objetivo || objetivo.rol !== 'cliente') return fail('No se encontró al cliente', 404)
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
}

Deno.serve(async (req) => {
  const cabeceras = corsPara(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabeceras })
  const res = await manejar(req)
  for (const [nombre, valor] of Object.entries(cabeceras)) res.headers.set(nombre, valor)
  res.headers.set('Cache-Control', 'no-store')
  return res
})
