import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Cliente de Supabase, o null si la app corre en modo local. */
export const sb = url && key ? createClient(url, key) : null

/** El usuario es un ID numérico asignado por el sistema; Supabase Auth necesita un email, así que se deriva uno interno. */
export const emailDe = (usuario: string) => `${usuario}@clientes.invalid`

/** Llama a una función de borde y devuelve su respuesta o lanza el mensaje de error legible. */
async function invocar<T>(nombre: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb!.functions.invoke(nombre, { body })
  if (!error) return data as T
  let message = 'No se pudo completar la acción. Intenta de nuevo.'
  const response = (error as { context?: Response }).context
  if (response && typeof response.json === 'function') {
    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      /* respuesta sin cuerpo: se usa el mensaje genérico */
    }
  }
  throw new Error(message)
}

/** Función `clientes` (registro y gestión de claves). */
export const invokeClientes = <T = { ok: true }>(body: Record<string, unknown>) => invocar<T>('clientes', body)

/** Función `pedido-correo`: envía por correo el archivo .txt del pedido. El administrador puede reenviarlo (`reenviar`). */
export const enviarPedidoPorCorreo = (pedido_id: string, reenviar = false) =>
  invocar<{ ok: true; ya_enviado?: boolean }>('pedido-correo', { pedido_id, reenviar })
