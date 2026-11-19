// Edge Function "clientes": registro con verificación por correo, recuperación de usuario y contraseña,
// y gestión de contraseñas. Se despliega con verify_jwt desactivado; las acciones que requieren sesión
// validan el token por su cuenta.
//
// Correo: se envía con Brevo (https://www.brevo.com). Secretos de la función:
//   BREVO_API_KEY        clave de API v3 de Brevo
//   BREVO_SENDER_EMAIL   remitente verificado en Brevo
//   BREVO_SENDER_NAME    (opcional) nombre del remitente, por defecto "Pedidos"
//   CORREO_SIMULADO=1    (solo pruebas) no envía: escribe el correo en los registros de la función
//   ALLOWED_ORIGINS      (opcional) orígenes del navegador permitidos, separados por comas
import { corsPara, fail } from './http.ts'
import { registrar } from './acciones/registrar.ts'
import { verificarCorreo } from './acciones/verificar-correo.ts'
import { reenviarCodigo } from './acciones/reenviar-codigo.ts'
import { recuperarPedir } from './acciones/recuperar-pedir.ts'
import { recuperarConfirmar } from './acciones/recuperar-confirmar.ts'
import { olvideUsuario } from './acciones/olvide-usuario.ts'
import { cambiarClave } from './acciones/cambiar-clave.ts'
import { restablecerClave } from './acciones/restablecer-clave.ts'

type Accion = (body: Record<string, unknown>, req: Request) => Promise<Response>

// Cada acción vive en su propio archivo de ./acciones; aquí solo se reparte la petición.
const ACCIONES: Record<string, Accion> = {
  registrar,
  verificar_correo: verificarCorreo,
  reenviar_codigo: reenviarCodigo,
  recuperar_pedir: recuperarPedir,
  recuperar_confirmar: recuperarConfirmar,
  olvide_usuario: olvideUsuario,
  cambiar_clave: cambiarClave,
  restablecer_clave: restablecerClave,
}

async function manejar(req: Request): Promise<Response> {
  if (req.method !== 'POST') return fail('Método no permitido', 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return fail('Solicitud inválida')
  }

  const nombre = String(body.accion ?? '')
  if (!Object.hasOwn(ACCIONES, nombre)) return fail('Acción desconocida')
  try {
    return await ACCIONES[nombre](body, req)
  } catch (e) {
    console.error(e)
    return fail('Ocurrió un error. Intenta de nuevo.', 500)
  }
}

Deno.serve(async (req) => {
  const cabeceras = corsPara(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabeceras })
  const res = await manejar(req)
  for (const [nombre, valor] of Object.entries(cabeceras)) res.headers.set(nombre, valor)
  res.headers.set('Cache-Control', 'no-store')
  return res
})
