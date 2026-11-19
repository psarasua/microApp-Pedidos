import { admin } from '../supabase.ts'
import { NO_ENVIADO, fail, json } from '../http.ts'
import { huellaIp, limpiarCorreo } from '../utiles.ts'
import { anotarEnvio, enviarCodigo, limiteEnvios } from '../envios.ts'

/** Reenviar el código de verificación. */
export async function reenviarCodigo(body: Record<string, unknown>, req: Request): Promise<Response> {
  const email = limpiarCorreo(body.email)
  const ip = await huellaIp(req)
  const limite = await limiteEnvios(email, ip, 'registro')
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
