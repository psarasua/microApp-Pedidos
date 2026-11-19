// Utilidades: aleatorios, hash, fechas y normalización de datos.

// Alfabeto de 32 símbolos sin caracteres confusos (sin 0, O, 1, I): cada byte aleatorio se reparte sin sesgo.
export const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function aleatorio(largo: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(largo))
  return Array.from(bytes, (b) => ALFABETO[b % 32]).join('')
}

export const entre = (min: number, max: number) => min + (crypto.getRandomValues(new Uint32Array(1))[0] % (max - min + 1))
export const nuevoId = () => String(entre(100000, 999999)) // ID de usuario: 6 dígitos
export const nuevoCodigo = () => String(entre(100000, 999999)) // código de verificación: 6 dígitos

export async function sha256(texto: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export const hace = (minutos: number) => new Date(Date.now() - minutos * 60_000).toISOString()
export const limpiarCorreo = (v: unknown) => String(v ?? '').trim().toLowerCase()
export const esCorreo = (s: string) => s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)

export async function huellaIp(req: Request): Promise<string> {
  const ip = (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  return sha256(`ip:${ip || 'desconocida'}`)
}

export const soloCodigo = (v: unknown) => String(v ?? '').replace(/\D/g, '')
