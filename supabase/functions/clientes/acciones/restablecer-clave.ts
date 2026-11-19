import { admin } from '../supabase.ts'
import { fail, json } from '../http.ts'
import { aleatorio } from '../utiles.ts'
import { sesionDe } from '../perfiles.ts'

/** Admin: restablecer la contraseña de un cliente con una temporal. */
export async function restablecerClave(body: Record<string, unknown>, req: Request): Promise<Response> {
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
