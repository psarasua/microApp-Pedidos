export type Category = { id: string; name: string }

export type Product = {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  category_id: string | null
}

export type OrderStatus = 'pendiente' | 'enviado' | 'entregado'

export type OrderItem = {
  product_id: string | null
  name: string
  price: number
  quantity: number
}

export type Order = {
  id: string
  created_at: string
  status: OrderStatus
  notes: string
  items: OrderItem[]
}

export type ProductInput = Omit<Product, 'id'> & { id?: string }

export interface Db {
  mode: 'local' | 'supabase'
  listCategories(): Promise<Category[]>
  saveCategory(c: { id?: string; name: string }): Promise<void>
  deleteCategory(id: string): Promise<void>
  listProducts(): Promise<Product[]>
  saveProduct(p: ProductInput): Promise<void>
  deleteProduct(id: string): Promise<void>
  uploadImage(blob: Blob): Promise<string>
  listOrders(): Promise<Order[]>
  createOrder(items: OrderItem[], notes: string): Promise<void>
  setOrderStatus(id: string, status: OrderStatus): Promise<void>
  deleteOrder(id: string): Promise<void>
}
