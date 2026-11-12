import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Cliente de Supabase, o null si la app corre en modo local. */
export const sb = url && key ? createClient(url, key) : null

/** El usuario es el número de celular; Supabase Auth necesita un email, así que se deriva uno interno. */
export const emailDe = (usuario: string) => `${usuario}@clientes.invalid`

/** Llama a la función `clientes` (registro y gestión de claves) y devuelve el mensaje de error legible. */
export async function invokeClientes(body: Record<string, unknown>): Promise<void> {
  const { error } = await sb!.functions.invoke('clientes', { body })
  if (!error) return
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
