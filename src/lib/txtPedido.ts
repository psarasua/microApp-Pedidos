import type { Order } from './types'

type Opciones = {
  /** Modo local (sin cuentas): no hay código de cliente, se usa 0. */
  sinCuentas?: boolean
}

const sinSeparadores = (v: string) => !/[,\r\n]/.test(v)

/**
 * Texto del pedido: una línea por artículo con `codigo_cliente,codigo_articulo,cantidad`, sin encabezado
 * y con fin de línea CRLF (el formato que leen los programas de Windows). Lanza un mensaje claro si falta algún dato.
 */
function textoPedido(o: Order, { sinCuentas = false }: Opciones = {}): string {
  const codigoCliente = (o.codigo_cliente ?? '').trim() || (sinCuentas ? '0' : '')
  if (!codigoCliente) throw new Error('Este pedido no tiene código de cliente, no se puede generar el archivo.')
  if (!sinSeparadores(codigoCliente)) throw new Error('El código de cliente tiene caracteres no válidos.')

  const sinCodigo = o.items.filter((i) => !i.codigo.trim())
  if (sinCodigo.length > 0)
    throw new Error(`Hay artículos sin código (${sinCodigo.map((i) => i.name).join(', ')}): no se puede generar el archivo.`)
  const raros = o.items.filter((i) => !sinSeparadores(i.codigo))
  if (raros.length > 0) throw new Error('Algún código de artículo tiene caracteres no válidos.')

  return o.items.map((i) => `${codigoCliente},${i.codigo.trim()},${i.quantity}`).join('\r\n') + '\r\n'
}

/** Nombre de archivo seguro, p. ej. pedido-1043-20261116-1555.txt */
function nombreArchivoPedido(o: Order): string {
  const cliente = (o.codigo_cliente ?? '').replace(/[^\w-]+/g, '') || 'cliente'
  const f = new Date(o.created_at)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `pedido-${cliente}-${f.getFullYear()}${dos(f.getMonth() + 1)}${dos(f.getDate())}-${dos(f.getHours())}${dos(f.getMinutes())}.txt`
}

/** Genera el archivo .txt del pedido y lo descarga. */
export function descargarTxtPedido(o: Order, opciones?: Opciones): void {
  const texto = textoPedido(o, opciones)
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivoPedido(o)
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
