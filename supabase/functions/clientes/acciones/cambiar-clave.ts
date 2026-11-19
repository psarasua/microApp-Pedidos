import { admin } from '../supabase.ts'
import { fail, json } from '../http.ts'
import { claveActualCorrecta, sesionDe, validarClave } from '../perfiles.ts'

/** Cambiar mi contraseña (con sesión). Si el admin la restableció, no pide la actual.. */
export async function cambiarClave(body: Record<string, unknown>, req: Request): Promise<Response> {
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
