// Plantillas y envío de correo con Brevo.

// ---- Correo ----
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export type Mensaje = { html: string; texto: string }

export function plantilla(titulo: string, lineas: string[], destacado?: string): Mensaje {
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#14213d">
<h2 style="margin:0 0 16px">${esc(titulo)}</h2>
${lineas.map((l) => `<p style="margin:0 0 12px;line-height:1.5">${esc(l)}</p>`).join('\n')}
${destacado ? `<p style="margin:20px 0;padding:14px;background:#ffd93d;border-radius:8px;text-align:center;font-size:30px;font-weight:bold;letter-spacing:6px">${esc(destacado)}</p>` : ''}
</div>`
  const texto = [titulo, '', ...lineas, ...(destacado ? ['', destacado] : [])].join('\n')
  return { html, texto }
}

export async function enviarCorreo(para: string, asunto: string, msg: Mensaje): Promise<void> {
  if (Deno.env.get('CORREO_SIMULADO') === '1') {
    console.log(`[correo simulado] para=${para} asunto=${asunto}\n${msg.texto}`)
    return
  }
  const clave = Deno.env.get('BREVO_API_KEY')
  const remitente = Deno.env.get('BREVO_SENDER_EMAIL')
  if (!clave || !remitente) throw new Error('El correo no está configurado (faltan BREVO_API_KEY o BREVO_SENDER_EMAIL)')
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': clave, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: Deno.env.get('BREVO_SENDER_NAME') ?? 'Pedidos', email: remitente },
      to: [{ email: para }],
      subject: asunto,
      htmlContent: msg.html,
      textContent: msg.texto,
    }),
  })
  if (!res.ok) throw new Error(`Brevo respondió ${res.status}: ${(await res.text()).slice(0, 200)}`)
}
