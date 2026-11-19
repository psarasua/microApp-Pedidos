// Respuestas HTTP comunes: CORS, JSON y mensajes de error.

// CORS: con ALLOWED_ORIGINS (lista separada por comas, p. ej. "https://pedidos.vercel.app") solo esos orígenes pueden llamar
// desde un navegador; sin ese secreto se permite cualquiera (la seguridad real está en los tokens y los límites).
export const ORIGENES = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

export function corsPara(req: Request): Record<string, string> {
  const origen = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ORIGENES.length === 0 ? '*' : ORIGENES.includes(origen) ? origen : ORIGENES[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export const fail = (message: string, status = 400) => json({ error: message }, status)

export const NO_ENVIADO = 'No pudimos enviar el correo. Revisa la dirección e intenta de nuevo.'
