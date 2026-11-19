import { db } from './db'

/** Borra todos los pedidos. El catálogo y los clientes quedan como están. */
export async function clearOrders() {
  for (const o of await db.listOrders()) await db.deleteOrder(o.id)
}

/** Borra los pedidos, los productos y las categorías. Los clientes y sus cuentas no se tocan. */
export async function clearCatalog() {
  await clearOrders()
  for (const p of await db.listProducts()) await db.deleteProduct(p.id)
  for (const c of await db.listCategories()) await db.deleteCategory(c.id)
}
