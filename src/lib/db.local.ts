import type { Category, Db, Order, Product } from './types'
import { blobToDataUrl } from './image'

const KEY = 'pedidos.v1'
type State = { categories: Category[]; products: Product[]; orders: Order[] }

const uid = () => crypto.randomUUID()

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    /* datos corruptos: se empieza de cero */
  }
  return { categories: [], products: [], orders: [] }
}

function save(state: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    throw new Error('No hay espacio en el dispositivo. Usa fotos más chicas o conecta Supabase.')
  }
}

function mutate(fn: (s: State) => void) {
  const s = load()
  fn(s)
  save(s)
}

export const localDb: Db = {
  mode: 'local',
  async listCategories() {
    return load().categories.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },
  async saveCategory(c) {
    mutate((s) => {
      if (c.id) {
        const found = s.categories.find((x) => x.id === c.id)
        if (found) found.name = c.name
      } else s.categories.push({ id: uid(), name: c.name })
    })
  },
  async deleteCategory(id, conProductos = false) {
    mutate((s) => {
      s.categories = s.categories.filter((c) => c.id !== id)
      if (conProductos) s.products = s.products.filter((p) => p.category_id !== id)
      else
        s.products.forEach((p) => {
          if (p.category_id === id) p.category_id = null
        })
    })
  },
  async listProducts() {
    // Los datos guardados antes de existir el código no lo traen.
    return load().products.map((p) => ({ ...p, codigo: p.codigo ?? '' })).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },
  async saveProduct(p) {
    mutate((s) => {
      const i = p.id ? s.products.findIndex((x) => x.id === p.id) : -1
      if (i >= 0) s.products[i] = { ...p, id: p.id! }
      else s.products.push({ ...p, id: uid() })
    })
  },
  async deleteProduct(id) {
    mutate((s) => {
      s.products = s.products.filter((p) => p.id !== id)
    })
  },
  uploadImage: blobToDataUrl,
  async listOrders() {
    return load().orders.sort((a, b) => b.created_at.localeCompare(a.created_at))
  },
  async createOrder(items, notes) {
    mutate((s) => {
      s.orders.push({ id: uid(), created_at: new Date().toISOString(), status: 'pendiente', notes, items })
    })
    return null
  },
  async setOrderStatus(id, status) {
    mutate((s) => {
      const o = s.orders.find((x) => x.id === id)
      if (o) o.status = status
    })
  },
  async deleteOrder(id) {
    mutate((s) => {
      s.orders = s.orders.filter((o) => o.id !== id)
    })
  },
  async listClientes() {
    return []
  },
  async setClienteEstado() {
    throw new Error('Los clientes requieren Supabase')
  },
  async resetClave() {
    throw new Error('Los clientes requieren Supabase')
  },
}
