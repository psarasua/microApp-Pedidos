export type Category = { id: string; name: string }

export type Product = {
  id: string
  /** Código del producto en el catálogo del proveedor. No es único: el catálogo repite algunos. */
  codigo: string
  name: string
  description: string
  price: number
  image_url: string | null
  category_id: string | null
}

export type OrderStatus = 'pendiente' | 'enviado' | 'entregado'

export type OrderItem = {
  product_id: string | null
  codigo: string
  name: string
  price: number
  quantity: number
}

export type Perfil = {
  id: string
  usuario: string
  nombre: string
  direccion: string
  telefono: string
  /** Correo del cliente; obligatorio al registrarse y verificado con un código. */
  email: string | null
  email_verificado: boolean
  /** Código y nombre del cliente en el sistema de quien recibe los pedidos. Solo los asigna el admin; sin ambos no se puede pedir. */
  codigo_cliente: string | null
  nombre_cliente: string | null
  /** El admin restableció la contraseña: la persona debe elegir una nueva antes de seguir. */
  debe_cambiar_clave: boolean
  rol: 'cliente' | 'admin'
  estado: 'pendiente' | 'aprobado' | 'bloqueado'
  created_at: string
}

export type Order = {
  id: string
  created_at: string
  status: OrderStatus
  notes: string
  items: OrderItem[]
  /** Código de cliente al confirmar el pedido (lo fija la base; no cambia si el admin lo edita después). */
  codigo_cliente?: string | null
  cliente?: { nombre: string; usuario: string; telefono?: string; direccion?: string; email?: string | null; nombre_cliente?: string | null } | null
}

export type ProductInput = Omit<Product, 'id'> & { id?: string }

export interface Db {
  mode: 'local' | 'supabase'
  listCategories(): Promise<Category[]>
  saveCategory(c: { id?: string; name: string }): Promise<void>
  /** Con `conProductos` también borra los productos de la categoría; si no, quedan sin categoría. */
  deleteCategory(id: string, conProductos?: boolean): Promise<void>
  listProducts(): Promise<Product[]>
  saveProduct(p: ProductInput): Promise<void>
  deleteProduct(id: string): Promise<void>
  uploadImage(blob: Blob): Promise<string>
  listOrders(): Promise<Order[]>
  /** Devuelve el id del pedido creado. */
  createOrder(items: OrderItem[], notes: string): Promise<string | null>
  setOrderStatus(id: string, status: OrderStatus): Promise<void>
  deleteOrder(id: string): Promise<void>
  listClientes(): Promise<Perfil[]>
  setClienteEstado(id: string, estado: Perfil['estado']): Promise<void>
  /** Asigna el código y el nombre de cliente (solo el admin). El código son 1 a 10 dígitos y no puede repetirse. */
  setClienteDatos(id: string, datos: { codigo_cliente: string; nombre_cliente: string }): Promise<void>
  /** Restablece la contraseña del cliente y devuelve la temporal generada (se muestra una sola vez). */
  resetClave(id: string): Promise<string>
}
