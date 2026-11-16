import type { Order } from './types'

const TINTA = 'FF17302B'
const MENTA = 'FF0F7B5F'
const CREMA = 'FFFBFAF6'
const DURAZNO = 'FFFFB86B'

const fechaLegible = (iso: string) =>
  new Date(iso).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })

/** Arma el Excel (.xlsx) de un pedido: datos del cliente arriba y una fila por artículo. La librería se carga recién al usarse. */
export async function armarExcelPedido(o: Order): Promise<Blob> {
  const { Workbook } = await import('exceljs')
  const libro = new Workbook()
  libro.creator = 'Pedidos'
  const hoja = libro.addWorksheet('Pedido', { views: [{ showGridLines: false }] })
  hoja.columns = [{ width: 12 }, { width: 52 }, { width: 11 }, { width: 14 }, { width: 14 }]

  hoja.mergeCells('A1:E1')
  const titulo = hoja.getCell('A1')
  titulo.value = 'Pedido'
  titulo.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MENTA } }
  titulo.alignment = { vertical: 'middle', indent: 1 }
  hoja.getRow(1).height = 30

  const c = o.cliente
  const datos: [string, string][] = [
    ['Cliente', c?.nombre ?? ''],
    ['Usuario', c?.usuario ?? ''],
    ['Teléfono', c?.telefono ?? ''],
    ['Dirección', c?.direccion ?? ''],
    ['Correo', c?.email ?? ''],
    ['Fecha', fechaLegible(o.created_at)],
    ['Notas', o.notes],
  ]
  datos.forEach(([etiqueta, valor], i) => {
    const fila = i + 2
    hoja.getCell(`A${fila}`).value = etiqueta
    hoja.getCell(`A${fila}`).font = { bold: true, color: { argb: TINTA } }
    hoja.mergeCells(`B${fila}:E${fila}`)
    hoja.getCell(`B${fila}`).value = valor
    hoja.getCell(`B${fila}`).alignment = { wrapText: true, vertical: 'top' }
  })

  const cabecera = datos.length + 3
  ;['Código', 'Producto', 'Cantidad', 'Precio', 'Subtotal'].forEach((t, i) => {
    const celda = hoja.getRow(cabecera).getCell(i + 1)
    celda.value = t
    celda.font = { bold: true, color: { argb: TINTA } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DURAZNO } }
    celda.alignment = { horizontal: i >= 2 ? 'right' : 'left', vertical: 'middle' }
  })

  const items = [...o.items].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const hayPrecios = items.some((l) => l.price > 0)
  items.forEach((l, i) => {
    const fila = cabecera + 1 + i
    const r = hoja.getRow(fila)
    r.getCell(1).value = l.codigo
    r.getCell(2).value = l.name
    r.getCell(3).value = l.quantity
    if (l.price > 0) {
      r.getCell(4).value = l.price
      r.getCell(5).value = { formula: `C${fila}*D${fila}`, result: l.price * l.quantity }
    }
    r.getCell(4).numFmt = '#,##0.00'
    r.getCell(5).numFmt = '#,##0.00'
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    if (i % 2 === 1) for (let k = 1; k <= 5; k++) r.getCell(k).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREMA } }
  })

  const ultima = cabecera + items.length
  const totalFila = ultima + 1
  hoja.getCell(`B${totalFila}`).value = 'Total de artículos'
  hoja.getCell(`B${totalFila}`).font = { bold: true }
  hoja.getCell(`C${totalFila}`).value = { formula: `SUM(C${cabecera + 1}:C${ultima})`, result: items.reduce((s, l) => s + l.quantity, 0) }
  hoja.getCell(`C${totalFila}`).font = { bold: true }
  if (hayPrecios) {
    hoja.getCell(`D${totalFila}`).value = 'Total'
    hoja.getCell(`D${totalFila}`).font = { bold: true }
    hoja.getCell(`D${totalFila}`).alignment = { horizontal: 'right' }
    hoja.getCell(`E${totalFila}`).value = {
      formula: `SUM(E${cabecera + 1}:E${ultima})`,
      result: items.reduce((s, l) => s + l.price * l.quantity, 0),
    }
    hoja.getCell(`E${totalFila}`).numFmt = '#,##0.00'
    hoja.getCell(`E${totalFila}`).font = { bold: true }
  }
  for (let k = 1; k <= 5; k++) hoja.getRow(totalFila).getCell(k).border = { top: { style: 'medium', color: { argb: TINTA } } }

  hoja.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  const bytes = await libro.xlsx.writeBuffer()
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/** Nombre de archivo seguro, p. ej. pedido-482913-20261116-1555.xlsx */
export function nombreArchivoPedido(o: Order): string {
  const usuario = (o.cliente?.usuario ?? '').replace(/[^\w-]+/g, '') || 'cliente'
  const f = new Date(o.created_at)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `pedido-${usuario}-${f.getFullYear()}${dos(f.getMonth() + 1)}${dos(f.getDate())}-${dos(f.getHours())}${dos(f.getMinutes())}.xlsx`
}

/** Genera el Excel del pedido y lo descarga. */
export async function descargarExcelPedido(o: Order): Promise<void> {
  const blob = await armarExcelPedido(o)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivoPedido(o)
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
