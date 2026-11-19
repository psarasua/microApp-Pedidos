// Perfiles y sesiones: búsqueda, limpieza de cuentas sin verificar y validación de contraseñas.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ANON, URL_SUPABASE, admin } from './supabase.ts'
import { SIN_VERIFICAR_HORAS } from './limites.ts'
import { hace } from './utiles.ts'
import { envios } from './envios.ts'

// El usuario es un ID numérico asignado por el sistema; Supabase Auth pide un email, así que se deriva uno interno
// (debe coincidir con src/lib/supabase.ts). El correo real del cliente se guarda en perfiles.email.
export const emailDe = (usuario: string) => `${usuario}@clientes.invalid`

// ---- Perfiles ----
export type PerfilCorreo = { id: string; usuario: string; nombre: string; email: string }

/** Busca por usuario (ID) o por correo; solo cuentas con correo verificado. */
export async function buscarPerfil(identificador: string): Promise<PerfilCorreo | null> {
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
export async function limpiar() {
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

export type Sesion = { id: string; usuario: string; rol: string; estado: string; debe_cambiar_clave: boolean }

/** Valida el token de la petición y devuelve el perfil de quien la hace. */
export async function sesionDe(req: Request): Promise<Sesion | null> {
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

export function validarClave(clave: unknown): string | null {
  if (typeof clave !== 'string' || clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (clave.length > 72) return 'La contraseña es demasiado larga'
  return null
}

/** Comprueba la contraseña actual con un cliente propio (no comparte sesión con otras peticiones). */
export async function claveActualCorrecta(usuario: string, clave: unknown): Promise<boolean> {
  const cliente = createClient(URL_SUPABASE, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await cliente.auth.signInWithPassword({ email: emailDe(usuario), password: String(clave ?? '') })
  return !error
}
