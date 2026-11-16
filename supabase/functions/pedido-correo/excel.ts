// Arma el Excel (.xlsx) de un pedido: datos del cliente arriba y una fila por artículo.
import ExcelJS from 'npm:exceljs@4.4.0'

export type Cliente = { nombre: string; usuario: string; telefono: string; direccion: string; email: string | null }
export type Linea = { codigo: string; nombre: string; cantidad: number; precio: number }
export type DatosPedido = { creado: string; notas: string; lineas: Linea[] }

const TINTA = 'FF17302B'
const MENTA = 'FF0F7B5F'
const CREMA = 'FFFBFAF6'
const DURAZNO = 'FFFFB86B'

/** Fecha legible en hora de Uruguay. */
export const fechaLegible = (iso: string) =>
  new Date(iso).toLocaleString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'short', timeStyle: 'short' })

export async function armarExcel(c: Cliente, p: DatosPedido): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook()
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

  const datos: [string, string][] = [
    ['Cliente', c.nombre],
    ['Usuario', c.usuario],
    ['Teléfono', c.telefono],
    ['Dirección', c.direccion],
    ['Correo', c.email ?? ''],
    ['Fecha', fechaLegible(p.creado)],
    ['Notas', p.notas],
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
  const titulos = ['Código', 'Producto', 'Cantidad', 'Precio', 'Subtotal']
  titulos.forEach((t, i) => {
    const celda = hoja.getRow(cabecera).getCell(i + 1)
    celda.value = t
    celda.font = { bold: true, color: { argb: TINTA } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DURAZNO } }
    celda.alignment = { horizontal: i >= 2 ? 'right' : 'left', vertical: 'middle' }
  })

  const hayPrecios = p.lineas.some((l) => l.precio > 0)
  p.lineas.forEach((l, i) => {
    const fila = cabecera + 1 + i
    const r = hoja.getRow(fila)
    r.getCell(1).value = l.codigo
    r.getCell(2).value = l.nombre
    r.getCell(3).value = l.cantidad
    if (l.precio > 0) {
      r.getCell(4).value = l.precio
      r.getCell(5).value = { formula: `C${fila}*D${fila}`, result: l.precio * l.cantidad }
    }
    r.getCell(4).numFmt = '#,##0.00'
    r.getCell(5).numFmt = '#,##0.00'
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    if (i % 2 === 1) for (let k = 1; k <= 5; k++) r.getCell(k).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREMA } }
  })

  const ultima = cabecera + p.lineas.length
  const totalFila = ultima + 1
  hoja.getCell(`B${totalFila}`).value = 'Total de artículos'
  hoja.getCell(`B${totalFila}`).font = { bold: true }
  hoja.getCell(`C${totalFila}`).value = { formula: `SUM(C${cabecera + 1}:C${ultima})`, result: p.lineas.reduce((s, l) => s + l.cantidad, 0) }
  hoja.getCell(`C${totalFila}`).font = { bold: true }
  if (hayPrecios) {
    hoja.getCell(`D${totalFila}`).value = 'Total'
    hoja.getCell(`D${totalFila}`).font = { bold: true }
    hoja.getCell(`D${totalFila}`).alignment = { horizontal: 'right' }
    hoja.getCell(`E${totalFila}`).value = {
      formula: `SUM(E${cabecera + 1}:E${ultima})`,
      result: p.lineas.reduce((s, l) => s + l.precio * l.cantidad, 0),
    }
    hoja.getCell(`E${totalFila}`).numFmt = '#,##0.00'
    hoja.getCell(`E${totalFila}`).font = { bold: true }
  }
  for (let k = 1; k <= 5; k++) hoja.getRow(totalFila).getCell(k).border = { top: { style: 'medium', color: { argb: TINTA } } }

  hoja.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  return new Uint8Array(await libro.xlsx.writeBuffer())
}
