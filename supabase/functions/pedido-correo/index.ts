// Edge Function "pedido-correo": envía por correo (Brevo) el archivo .txt de un pedido (codigo_cliente,codigo_articulo,cantidad) a los destinatarios configurados.
// Se despliega con verify_jwt desactivado; valida el token de la persona por su cuenta.
//
// Secretos de la función:
//   PEDIDOS_DESTINO      correos que reciben cada pedido, separados por comas (obligatorio)
//   PEDIDOS_COPIA        (opcional) correos en copia, separados por comas
//   BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME   los mismos que usa la función `clientes`
//   CORREO_SIMULADO=1    (solo pruebas) no envía: deja un registro en los logs
//   ALLOWED_ORIGINS      (opcional) orígenes del navegador permitidos, separados por comas
import { Buffer } from 'node:buffer'
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ORIGENES = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

function corsPara(req: Request): Record<string, string> {
  const origen = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ORIGENES.length === 0 ? '*' : ORIGENES.includes(origen) ? origen : ORIGENES[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const fail = (message: string, status = 400) => json({ error: message }, status)

const fechaLegible = (iso: string) =>
  new Date(iso).toLocaleString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'short', timeStyle: 'short' })
type Linea = { codigo: string; nombre: string; cantidad: number; precio: number }
type Cliente = { nombre: string; usuario: string; email: string | null }

const lista = (v: string | undefined) =>
  (v ?? '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s))

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

async function manejar(req: Request): Promise<Response> {
  if (req.method !== 'POST') return fail('Método no permitido', 405)

  let body: { pedido_id?: unknown; reenviar?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail('Solicitud inválida')
  }
  const pedidoId = String(body.pedido_id ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(pedidoId)) return fail('Pedido inválido')

  // Quién llama
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return fail('Tu sesión venció. Entra de nuevo.', 401)
  const { data: sesion } = await admin.auth.getUser(token)
  if (!sesion.user) return fail('Tu sesión venció. Entra de nuevo.', 401)
  const { data: quien } = await admin.from('perfiles').select('rol, estado').eq('id', sesion.user.id).maybeSingle()
  if (!quien || quien.estado !== 'aprobado') return fail('No autorizado', 403)
  const esAdmin = quien.rol === 'admin'

  // El pedido: solo su dueño o un administrador
  const { data: pedido } = await admin
    .from('pedidos')
    .select('id, created_at, notas, cliente_id, codigo_cliente, correo_enviado_at')
    .eq('id', pedidoId)
    .maybeSingle()
  if (!pedido || (pedido.cliente_id !== sesion.user.id && !esAdmin)) return fail('No se encontró el pedido', 404)

  const destino = lista(Deno.env.get('PEDIDOS_DESTINO'))
  const copia = lista(Deno.env.get('PEDIDOS_COPIA')).filter((c) => !destino.includes(c))
  if (destino.length === 0) return fail('El correo de pedidos no está configurado.', 503)

  // Un pedido se envía una sola vez: se reserva el envío de forma atómica (dos llamadas a la vez no duplican el correo).
  // Solo el administrador puede reenviarlo.
  const reenviar = esAdmin && body.reenviar === true
  const anterior = pedido.correo_enviado_at as string | null
  if (reenviar) await admin.from('pedidos').update({ correo_enviado_at: new Date().toISOString() }).eq('id', pedidoId)
  else {
    const { data: reservado } = await admin
      .from('pedidos')
      .update({ correo_enviado_at: new Date().toISOString() })
      .eq('id', pedidoId)
      .is('correo_enviado_at', null)
      .select('id')
    if (!reservado?.length) return json({ ok: true, ya_enviado: true })
  }
  const soltar = () => admin.from('pedidos').update({ correo_enviado_at: anterior }).eq('id', pedidoId)

  const { data: items } = await admin
    .from('pedido_items')
    .select('codigo, nombre, precio, cantidad')
    .eq('pedido_id', pedidoId)
    .order('nombre')
  const lineas: Linea[] = (items ?? []).map((i) => ({ codigo: i.codigo, nombre: i.nombre, cantidad: i.cantidad, precio: Number(i.precio) }))
  if (lineas.length === 0) {
    await soltar()
    return fail('El pedido no tiene artículos')
  }

  const { data: cli } = pedido.cliente_id
    ? await admin.from('perfiles').select('nombre, usuario, email').eq('id', pedido.cliente_id).maybeSingle()
    : { data: null }
  const cliente: Cliente = cli ?? { nombre: 'Sin datos', usuario: '', email: null }

  // Una línea por artículo: codigo_cliente,codigo_articulo,cantidad (sin encabezado, fin de línea CRLF).
  const codigoCliente = String(pedido.codigo_cliente ?? '').trim()
  if (!/^[0-9]{1,10}$/.test(codigoCliente) || lineas.some((l) => !l.codigo.trim() || /[,
]/.test(l.codigo))) {
    await soltar()
    return fail('El pedido no tiene código de cliente o tiene artículos sin código válido.')
  }
  const contenido = lineas.map((l) => `${codigoCliente},${l.codigo.trim()},${l.cantidad}`).join('
') + '
'
  const adjunto = new TextEncoder().encode(contenido)
  const cantidad = lineas.reduce((s, l) => s + l.cantidad, 0)
  const total = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0)
  const cuando = fechaLegible(pedido.created_at)
  const archivo = `pedido-${codigoCliente}-${pedido.created_at.slice(0, 16).replace(/[-:T]/g, '')}.txt`
  const asunto = `Pedido de ${cliente.nombre} · ${cuando}`

  const texto = [
    `Pedido de ${cliente.nombre} (usuario ${cliente.usuario})`,
    `Fecha: ${cuando}`,
    `${lineas.length} productos, ${cantidad} artículos${total > 0 ? `, total ${total.toFixed(2)}` : ''}`,
    pedido.notas ? `Notas: ${pedido.notas}` : '',
    'El detalle va en el archivo .txt adjunto.',
  ].filter(Boolean).join('\n')
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;color:#17302b">
<h2 style="margin:0 0 12px">Pedido de ${esc(cliente.nombre)}</h2>
<p style="margin:0 0 6px">Usuario ${esc(cliente.usuario)} · ${esc(cuando)}</p>
<p style="margin:0 0 6px">${lineas.length} productos, ${cantidad} artículos${total > 0 ? `, total ${total.toFixed(2)}` : ''}</p>
${pedido.notas ? `<p style="margin:12px 0;padding:10px;background:#fbfaf6;border-radius:8px">${esc(pedido.notas)}</p>` : ''}
<p style="margin:12px 0 0">El detalle va en el archivo .txt adjunto.</p>
</div>`

  if (Deno.env.get('CORREO_SIMULADO') === '1') {
    console.log(`[pedido simulado] para=${destino} cc=${copia} asunto=${asunto} archivo=${archivo} bytes=${adjunto.length}\n${texto}`)
  } else {
    const clave = Deno.env.get('BREVO_API_KEY')
    const remitente = Deno.env.get('BREVO_SENDER_EMAIL')
    if (!clave || !remitente) {
      await soltar()
      return fail('El correo no está configurado.', 503)
    }
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': clave, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: Deno.env.get('BREVO_SENDER_NAME') ?? 'Pedidos', email: remitente },
        to: destino.map((email) => ({ email })),
        ...(copia.length ? { cc: copia.map((email) => ({ email })) } : {}),
        ...(cliente.email ? { replyTo: { email: cliente.email, name: cliente.nombre } } : {}),
        subject: asunto,
        htmlContent: html,
        textContent: texto,
        attachment: [{ name: archivo, content: Buffer.from(adjunto).toString('base64') }],
      }),
    })
    if (!res.ok) {
      console.error(`pedido-correo: Brevo respondió ${res.status}: ${(await res.text()).slice(0, 200)}`)
      await soltar()
      return fail('No se pudo enviar el correo del pedido.', 502)
    }
  }

  return json({ ok: true })
}

Deno.serve(async (req) => {
  const cabeceras = corsPara(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabeceras })
  let res: Response
  try {
    res = await manejar(req)
  } catch (e) {
    console.error(e)
    res = fail('Ocurrió un error. Intenta de nuevo.', 500)
  }
  for (const [nombre, valor] of Object.entries(cabeceras)) res.headers.set(nombre, valor)
  res.headers.set('Cache-Control', 'no-store')
  return res
})
