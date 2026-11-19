import { admin } from '../supabase.ts'
import { NO_ENVIADO, fail, json } from '../http.ts'
import { INTENTOS_ID, MAX_PENDIENTES, REGISTROS_IP_HORA } from '../limites.ts'
import { esCorreo, hace, huellaIp, limpiarCorreo, nuevoId } from '../utiles.ts'
import { enviarCodigo, envios, limiteEnvios } from '../envios.ts'
import { emailDe, limpiar, validarClave } from '../perfiles.ts'

/** Registro: crea la cuenta sin verificar y envía el código al correo. */
export async function registrar(body: Record<string, unknown>, req: Request): Promise<Response> {
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
