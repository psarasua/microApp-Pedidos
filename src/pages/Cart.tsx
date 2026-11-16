import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { confirmar } from '../components/confirmar'
import { ProductPhoto } from '../components/ProductPhoto'
import { Stepper } from '../components/Stepper'
import { Button, Empty, inputClass } from '../components/ui'
import { useCart } from '../lib/cart'
import { useData } from '../lib/data'
import { db } from '../lib/db'
import { formatMoney } from '../lib/format'
import type { OrderItem } from '../lib/types'

export function Cart() {
  const { products, refresh } = useData()
  const cart = useCart()
  const nav = useNavigate()
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const lines = cart.lines
    .map((l) => ({ ...l, product: products.find((p) => p.id === l.productId) }))
    .filter((l): l is typeof l & { product: NonNullable<typeof l.product> } => Boolean(l.product))

  if (lines.length === 0)
    return (
      <Empty title="El pedido está vacío">
        Elige productos en el <Link to="/" className="font-semibold text-accion underline">catálogo</Link>.
      </Empty>
    )

  const total = cart.totalFor(products)

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      const items: OrderItem[] = lines.map((l) => ({
        product_id: l.product.id,
        codigo: l.product.codigo,
        name: l.product.name,
        price: l.product.price,
        quantity: l.quantity,
      }))
      await db.createOrder(items, notes.trim())
      cart.clear()
      await refresh()
      nav('/historial')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el pedido. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-extrabold">Nuevo pedido</h1>
      <div className="ticket px-5 py-8 shadow-[0_1px_0_var(--color-line)]">
        <ul className="divide-y divide-dashed divide-line">
          {lines.map(({ product: p, quantity }) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <ProductPhoto src={p.image_url} alt={p.name} className="h-16 w-16 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-semibold leading-tight">{p.name}</p>
                <p className="truncate text-sm text-ink-soft">{p.codigo && `Cód. ${p.codigo} · `}{p.price > 0 ? `${formatMoney(p.price)} c/u` : 'Sin precio'}</p>
                {p.price > 0 && <p className="font-bold">{formatMoney(p.price * quantity)}</p>}
              </div>
              <Stepper value={quantity} onChange={(n) => cart.setQty(p.id, n)} label={p.name} />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t-2 border-ink pt-4">
          <span className="text-lg font-bold">Total</span>
          <span className="bg-mark px-2 text-3xl font-extrabold">{total > 0 ? formatMoney(total) : 'A definir'}</span>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="mb-1 block text-sm font-semibold text-ink-soft">Notas del pedido (opcional)</span>
        <textarea className={`${inputClass} h-24 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cliente, dirección, hora de entrega…" />
      </label>

      {error && <p role="alert" className="mt-3 text-stamp">{error}</p>}
      <Button className="mt-4 w-full" onClick={confirm} disabled={busy}>
        {busy ? 'Guardando…' : 'Confirmar pedido'}
      </Button>
      <Button variant="ghost" className="mt-2 w-full" onClick={() => confirm_clear(cart.clear)}>Vaciar pedido</Button>
    </div>
  )
}

async function confirm_clear(clear: () => void) {
  if (await confirmar('¿Vaciar todo el pedido?', 'Vaciar')) clear()
}
