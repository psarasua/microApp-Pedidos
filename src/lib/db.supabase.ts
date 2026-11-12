import { createClient } from '@supabase/supabase-js'
import type { Db, Order } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const BUCKET = 'productos'

export function createSupabaseDb(): Db {
  const sb = createClient(url, key)

  const check = <T extends { error: { message: string } | null }>(res: T): T => {
    if (res.error) throw new Error(res.error.message)
    return res
  }

  return {
    mode: 'supabase',
    async listCategories() {
      const { data } = check(await sb.from('categorias').select('id, name:nombre').order('nombre'))
      return data ?? []
    },
    async saveCategory(c) {
      if (c.id) check(await sb.from('categorias').update({ nombre: c.name }).eq('id', c.id))
      else check(await sb.from('categorias').insert({ nombre: c.name }))
    },
    async deleteCategory(id) {
      check(await sb.from('categorias').delete().eq('id', id))
    },
    async listProducts() {
      const { data } = check(
        await sb
          .from('productos')
          .select('id, name:nombre, description:descripcion, price:precio, image_url, category_id:categoria_id')
          .order('nombre'),
      )
      return (data ?? []).map((p) => ({ ...p, price: Number(p.price), description: p.description ?? '' }))
    },
    async saveProduct(p) {
      const row = {
        nombre: p.name,
        descripcion: p.description,
        precio: p.price,
        image_url: p.image_url,
        categoria_id: p.category_id,
      }
      if (p.id) check(await sb.from('productos').update(row).eq('id', p.id))
      else check(await sb.from('productos').insert(row))
    },
    async deleteProduct(id) {
      check(await sb.from('productos').delete().eq('id', id))
    },
    async uploadImage(blob) {
      const path = `${crypto.randomUUID()}.jpg`
      check(await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' }))
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    },
    async listOrders() {
      const { data } = check(
        await sb
          .from('pedidos')
          .select('id, created_at, status:estado, notes:notas, items:pedido_items(product_id:producto_id, name:nombre, price:precio, quantity:cantidad)')
          .order('created_at', { ascending: false }),
      )
      return (data ?? []) as unknown as Order[]
    },
    async createOrder(items, notes) {
      const { data } = check(await sb.from('pedidos').insert({ notas: notes }).select('id').single())
      check(
        await sb.from('pedido_items').insert(
          items.map((i) => ({
            pedido_id: data!.id,
            producto_id: i.product_id,
            nombre: i.name,
            precio: i.price,
            cantidad: i.quantity,
          })),
        ),
      )
    },
    async setOrderStatus(id, status) {
      check(await sb.from('pedidos').update({ estado: status }).eq('id', id))
    },
    async deleteOrder(id) {
      check(await sb.from('pedidos').delete().eq('id', id))
    },
  }
}
