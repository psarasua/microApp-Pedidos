// Registro de envíos, límites por correo y conexión, y validación de códigos.
import { admin } from './supabase.ts'
import { fail } from './http.ts'
import { CODIGO_INTENTOS, CODIGO_VENCE_MIN, ENVIOS_CORREO_HORA, ENVIOS_GLOBAL_DIA, ENVIOS_IP_HORA, ESPERA_SEG } from './limites.ts'
import { aleatorio, hace, iguales, nuevoCodigo, sha256 } from './utiles.ts'
import { Mensaje, enviarCorreo, plantilla } from './correo.ts'

// ---- Registro de envíos y límites ----
export const envios = () => admin.from('envios_correo')

/** Devuelve el motivo si no se puede enviar otro correo a esta clave (correo o identificador) desde esta conexión. */
export async function limiteEnvios(clave: string, ip: string): Promise<string | null> {
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

export async function anotarEnvio(d: { email: string; ip: string; tipo: string; perfilId?: string | null; codigo?: string }): Promise<string> {
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
export async function enviarCodigo(o: { tipo: 'registro' | 'recuperacion'; email: string; perfilId: string; ip: string; nombre: string }) {
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
export async function enviarAviso(email: string, ip: string, perfilId: string | null, asunto: string, msg: Mensaje) {
  try {
    const id = await anotarEnvio({ email, ip, tipo: 'aviso', perfilId })
    await enviarCorreo(email, asunto, msg)
    await envios().update({ enviado: true }).eq('id', id)
  } catch (e) {
    console.error('No se pudo enviar el aviso:', e instanceof Error ? e.message : e)
  }
}

export type Veredicto = { ok: true } | { ok: false; res: Response }

/** Comprueba el último código vigente de esa clave y tipo. Cuenta cada intento y lo gasta si es correcto. */
export async function validarCodigo(clave: string, tipo: 'registro' | 'recuperacion', codigo: string): Promise<Veredicto> {
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
