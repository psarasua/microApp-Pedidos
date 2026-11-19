import { admin } from '../supabase.ts'
import { fail, json } from '../http.ts'
import { huellaIp, limpiarCorreo, soloCodigo } from '../utiles.ts'
import { plantilla } from '../correo.ts'
import { enviarAviso, validarCodigo } from '../envios.ts'

/** Verificar el correo con el código; devuelve el usuario (ID) y lo envía también por correo. */
export async function verificarCorreo(body: Record<string, unknown>, req: Request): Promise<Response> {
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
