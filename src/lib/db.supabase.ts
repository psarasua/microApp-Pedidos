import { invokeClientes, sb as client } from './supabase'
import type { Db, Order, Perfil } from './types'

const BUCKET = 'productos'

export function createSupabaseDb(): Db {
  const sb = client!

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
          .select('id, codigo, name:nombre, description:descripcion, price:precio, image_url, category_id:categoria_id')
          .order('nombre')
          .limit(5000),
      )
      return (data ?? []).map((p) => ({ ...p, price: Number(p.price), description: p.description ?? '' }))
    },
    async saveProduct(p) {
      const row = {
        codigo: p.codigo,
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
          .select('id, created_at, status:estado, notes:notas, cliente:perfiles(nombre, usuario), items:pedido_items(product_id:producto_id, codigo, name:nombre, price:precio, quantity:cantidad)')
          .order('created_at', { ascending: false }),
      )
      return (data ?? []) as unknown as Order[]
    },
    async createOrder(items, notes) {
      // El nombre y el precio los fija el servidor (trigger); solo se envían producto y cantidad.
      check(
        await sb.rpc('crear_pedido', {
          p_notas: notes,
          p_items: items.map((i) => ({ producto_id: i.product_id, cantidad: i.quantity })),
        }),
      )
    },
    async setOrderStatus(id, status) {
      check(await sb.from('pedidos').update({ estado: status }).eq('id', id))
    },
    async deleteOrder(id) {
      check(await sb.from('pedidos').delete().eq('id', id))
    },
    async listClientes() {
      const { data } = check(await sb.from('perfiles').select('*').eq('rol', 'cliente').order('created_at', { ascending: false }))
      return (data ?? []) as Perfil[]
    },
    async setClienteEstado(id, estado) {
      check(await sb.from('perfiles').update({ estado }).eq('id', id))
    },
    async resetClave(id) {
      const { temporal } = await invokeClientes<{ ok: true; temporal: string }>({ accion: 'restablecer_clave', id })
      return temporal
    },
  }
}
