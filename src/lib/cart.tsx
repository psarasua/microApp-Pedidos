import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from './types'

type Cart = Record<string, number>
const KEY = 'pedidos.cart.v1'

type CartCtx = {
  qty: (productId: string) => number
  setQty: (productId: string, n: number) => void
  clear: () => void
  lines: { productId: string; quantity: number }[]
  count: number
  totalFor: (products: Product[]) => number
}

const Ctx = createContext<CartCtx | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(() => {
    // El contenido del almacenamiento no es confiable: se descartan claves o cantidades inválidas.
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
      const limpio: Cart = {}
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const [id, n] of Object.entries(raw)) {
          if (typeof n === 'number' && Number.isInteger(n) && n > 0) limpio[id] = Math.min(n, 9999)
        }
      }
      return limpio
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart))
    } catch {
      /* el carrito sigue funcionando en memoria */
    }
  }, [cart])

  const value = useMemo<CartCtx>(() => {
    const lines = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }))
    return {
      qty: (id) => cart[id] ?? 0,
      setQty: (id, n) =>
        setCart((c) => {
          const next = { ...c }
          if (n <= 0) delete next[id]
          else next[id] = Math.min(n, 9999)
          return next
        }),
      clear: () => setCart({}),
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      totalFor: (products) =>
        lines.reduce((s, l) => s + l.quantity * (products.find((p) => p.id === l.productId)?.price ?? 0), 0),
    }
  }, [cart])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCart fuera de CartProvider')
  return v
}
