import { NO_ENVIADO, fail, json } from '../http.ts'
import { huellaIp } from '../utiles.ts'
import { anotarEnvio, enviarCodigo, limiteEnvios } from '../envios.ts'
import { buscarPerfil } from '../perfiles.ts'

/** Olvidé mi contraseña, paso 1: se envía un código al correo de la cuenta. */
export async function recuperarPedir(body: Record<string, unknown>, req: Request): Promise<Response> {
  const identificador = String(body.identificador ?? '').slice(0, 254)
  const ip = await huellaIp(req)
  const perfil = await buscarPerfil(identificador)
  // La respuesta es la misma exista o no la cuenta, para no revelar quién tiene una.
  const clave = perfil?.email ?? `sin:${identificador.trim().toLowerCase()}`
  const limite = await limiteEnvios(clave, ip, 'recuperacion')
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
