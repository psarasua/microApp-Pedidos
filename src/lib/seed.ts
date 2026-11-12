import { db } from './db'
import type { OrderItem, OrderStatus } from './types'

/** Imagen provisoria: la inicial del producto sobre un color. */
const tile = (color: string, name: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${color}"/><text x="200" y="230" font-size="150" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="700">${name[0].toUpperCase()}</text></svg>`,
  )

const CATEGORIAS = ['Bebidas', 'Almacén', 'Limpieza']

const PRODUCTOS = [
  { nombre: 'Agua mineral 2L', descripcion: 'Sin gas', precio: 85, categoria: 'Bebidas', color: '#2347c5' },
  { nombre: 'Refresco cola 2.25L', descripcion: 'Botella retornable', precio: 165, categoria: 'Bebidas', color: '#b3261e' },
  { nombre: 'Jugo de naranja 1L', descripcion: '100% exprimido', precio: 120, categoria: 'Bebidas', color: '#d9822b' },
  { nombre: 'Yerba mate 1kg', descripcion: 'Suave, sin palo', precio: 310.5, categoria: 'Almacén', color: '#3f7d4e' },
  { nombre: 'Arroz 1kg', descripcion: 'Grano largo fino', precio: 95, categoria: 'Almacén', color: '#a8742c' },
  { nombre: 'Fideos tallarín 500g', descripcion: 'Sémola', precio: 78, categoria: 'Almacén', color: '#c9a227' },
  { nombre: 'Aceite de girasol 900ml', descripcion: '', precio: 189, categoria: 'Almacén', color: '#8a6d00' },
  { nombre: 'Detergente 750ml', descripcion: 'Limón', precio: 120, categoria: 'Limpieza', color: '#1f8a8a' },
  { nombre: 'Lavandina 1L', descripcion: '', precio: 65, categoria: 'Limpieza', color: '#5b5bd6' },
  { nombre: 'Papel higiénico x4', descripcion: 'Doble hoja', precio: 140, categoria: 'Limpieza', color: '#6b7a99' },
]

const PEDIDOS: { notas: string; estado: OrderStatus; items: [string, number][] }[] = [
  { notas: 'Almacén Don Pepe, entrega por la mañana', estado: 'entregado', items: [['Arroz 1kg', 12], ['Fideos tallarín 500g', 10], ['Yerba mate 1kg', 8]] },
  { notas: 'Kiosco Central', estado: 'enviado', items: [['Agua mineral 2L', 24], ['Refresco cola 2.25L', 18]] },
  { notas: '', estado: 'pendiente', items: [['Detergente 750ml', 6], ['Lavandina 1L', 6]] },
]

export async function clearOrders() {
  for (const o of await db.listOrders()) await db.deleteOrder(o.id)
}

export async function clearCatalog() {
  await clearOrders()
  for (const p of await db.listProducts()) await db.deleteProduct(p.id)
  for (const c of await db.listCategories()) await db.deleteCategory(c.id)
}

/** Agrega categorías y productos de ejemplo sin duplicar los que ya existen por nombre. Los pedidos de ejemplo solo se crean si todavía no hay ninguno. */
export async function loadSample() {
  const existingCats = new Set((await db.listCategories()).map((c) => c.name))
  for (const nombre of CATEGORIAS) if (!existingCats.has(nombre)) await db.saveCategory({ name: nombre })
  const categories = await db.listCategories()

  const existingProducts = new Set((await db.listProducts()).map((p) => p.name))
  for (const p of PRODUCTOS) {
    if (existingProducts.has(p.nombre)) continue
    await db.saveProduct({
      name: p.nombre,
      description: p.descripcion,
      price: p.precio,
      image_url: tile(p.color, p.nombre),
      category_id: categories.find((c) => c.name === p.categoria)?.id ?? null,
    })
  }
  const products = await db.listProducts()

  if ((await db.listOrders()).length > 0) return

  for (const ped of PEDIDOS) {
    const items: OrderItem[] = ped.items.flatMap(([nombre, quantity]) => {
      const p = products.find((x) => x.name === nombre)
      return p ? [{ product_id: p.id, name: p.name, price: p.price, quantity }] : []
    })
    if (items.length === 0) continue
    await db.createOrder(items, ped.notas)
  }
  // Los pedidos nuevos quedan al final de la lista; se les asigna el estado de ejemplo en el mismo orden.
  const created = (await db.listOrders()).slice(0, PEDIDOS.length).reverse()
  for (const [i, o] of created.entries()) if (PEDIDOS[i].estado !== 'pendiente') await db.setOrderStatus(o.id, PEDIDOS[i].estado)
}
