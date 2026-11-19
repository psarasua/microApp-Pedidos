import { NO_ENVIADO, fail, json } from '../http.ts'
import { huellaIp, limpiarCorreo } from '../utiles.ts'
import { enviarCorreo, plantilla } from '../correo.ts'
import { anotarEnvio, envios, limiteEnvios } from '../envios.ts'
import { buscarPerfil } from '../perfiles.ts'

/** Olvidé mi usuario: se envía el ID al correo. */
export async function olvideUsuario(body: Record<string, unknown>, req: Request): Promise<Response> {
  const email = limpiarCorreo(body.email)
  const ip = await huellaIp(req)
  const limite = await limiteEnvios(email, ip, 'usuario')
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
