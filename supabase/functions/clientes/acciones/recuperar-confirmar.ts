import { admin } from '../supabase.ts'
import { fail, json } from '../http.ts'
import { huellaIp, soloCodigo } from '../utiles.ts'
import { plantilla } from '../correo.ts'
import { enviarAviso, envios, validarCodigo } from '../envios.ts'
import { buscarPerfil, validarClave } from '../perfiles.ts'

/** Olvidé mi contraseña, paso 2: con el código correcto se elige la contraseña nueva. */
export async function recuperarConfirmar(body: Record<string, unknown>, req: Request): Promise<Response> {
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
