import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { confirmar } from '../components/confirmar'
import { Button, Empty, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { useData } from '../lib/data'
import { db } from '../lib/db'
import { descargarExcelPedido } from '../lib/excelPedido'
import { formatDate, formatMoney } from '../lib/format'
import type { Order, OrderStatus } from '../lib/types'

const STATUSES: OrderStatus[] = ['pendiente', 'enviado', 'entregado']
const statusStyle: Record<OrderStatus, string> = {
  pendiente: 'bg-mark text-ink',
  enviado: 'bg-accion text-white',
  entregado: 'bg-ink text-white',
}

const orderTotal = (o: Order) => o.items.reduce((s, i) => s + i.price * i.quantity, 0)

function whatsappText(o: Order) {
  const lines = o.items.map((i) => `• ${i.quantity} × ${i.name}${i.codigo ? ` (cód. ${i.codigo})` : ''}${i.price > 0 ? ` — ${formatMoney(i.price * i.quantity)}` : ''}`)
  const total = orderTotal(o)
  const text = [`Pedido del ${formatDate(o.created_at)}`, ...lines, total > 0 && `Total: ${formatMoney(total)}`, o.notes && `Notas: ${o.notes}`]
    .filter(Boolean)
    .join('\n')
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function Orders() {
  const { orders, products, loading, refresh } = useData()
  const cart = useCart()
  const nav = useNavigate()
  const { isAdmin } = useAuth()
  const location = useLocation()
  // Al venir de confirmar un pedido se abre ese pedido y se ofrece la descarga del Excel.
  const nuevo = (location.state as { nuevo?: string | null } | null)?.nuevo ?? null
  const [open, setOpen] = useState<string | null>(nuevo)
  const [error, setError] = useState('')
  const [descargando, setDescargando] = useState<string | null>(null)

  async function descargar(o: Order) {
    setError('')
    setDescargando(o.id)
    try {
      await descargarExcelPedido(o)
    } catch {
      setError('No se pudo generar el Excel. Intenta de nuevo.')
    } finally {
      setDescargando(null)
    }
  }
  const pedidoNuevo = nuevo ? orders.find((o) => o.id === nuevo) : undefined

  async function run(fn: () => Promise<void>) {
    setError('')
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción')
    }
  }

  async function repeat(o: Order) {
    const available = o.items.filter((i) => i.product_id && products.some((p) => p.id === i.product_id))
    if (available.length === 0) return setError('Los productos de este pedido ya no están disponibles.')
    const missing = o.items.length - available.length
    if (missing > 0 && !(await confirmar(`${missing} producto(s) ya no están disponibles y no se agregarán. ¿Continuar?`, 'Continuar'))) return
    cart.clear()
    for (const i of available) cart.setQty(i.product_id!, i.quantity)
    nav('/pedido')
  }

  if (loading) return <Spinner />
  if (orders.length === 0) return <Empty title="Aún no hay pedidos">Los pedidos confirmados aparecen acá.</Empty>

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-extrabold">{isAdmin ? 'Pedidos recibidos' : 'Mis pedidos'}</h1>
      {error && <p role="alert" className="mb-3 text-stamp">{error}</p>}
      {pedidoNuevo && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accion-soft p-4">
          <p className="font-semibold text-accion-dark">Pedido confirmado. El Excel está listo.</p>
          <Button onClick={() => descargar(pedidoNuevo)} disabled={descargando === pedidoNuevo.id}>
            {descargando === pedidoNuevo.id ? 'Preparando…' : 'Descargar Excel'}
          </Button>
        </div>
      )}
      <ul className="space-y-3">
        {orders.map((o) => {
          const isOpen = open === o.id
          return (
            <li key={o.id} className="rounded-xl border-2 border-line bg-sheet">
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : o.id)} aria-expanded={isOpen}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{formatDate(o.created_at)}</p>
                  <p className="text-sm text-ink-soft">{isAdmin && o.cliente ? `${o.cliente.nombre} · ` : ''}{o.items.reduce((s, i) => s + i.quantity, 0)} artículos</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyle[o.status]}`}>{o.status}</span>
                <span className="w-24 text-right text-lg font-extrabold">{orderTotal(o) > 0 ? formatMoney(orderTotal(o)) : '—'}</span>
              </button>
              {isOpen && (
                <div className="border-t-2 border-dashed border-line p-4">
                  <ul className="space-y-1">
                    {o.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-3">
                        <span>{i.quantity} × {i.name}{i.codigo && <span className="text-ink-soft"> · cód. {i.codigo}</span>}</span>
                        {i.price > 0 && <span className="font-semibold">{formatMoney(i.price * i.quantity)}</span>}
                      </li>
                    ))}
                  </ul>
                  {o.notes && <p className="mt-3 rounded-lg bg-paper p-3 text-sm">{o.notes}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => descargar(o)} disabled={descargando === o.id} className="h-10 text-sm">
                      {descargando === o.id ? 'Preparando…' : 'Descargar Excel'}
                    </Button>
                    <Button variant="ghost" onClick={() => repeat(o)}>Repetir pedido</Button>
                  </div>
                  {isAdmin && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUSES.filter((s) => s !== o.status).map((s) => (
                      <Button key={s} variant="ghost" onClick={() => run(() => db.setOrderStatus(o.id, s))}>
                        Marcar {s}
                      </Button>
                    ))}
                    <a href={whatsappText(o)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border-2 border-line px-4 text-sm font-semibold hover:border-ink">
                      Enviar por WhatsApp
                    </a>
                    <Button
                      variant="danger"
                      onClick={async () => (await confirmar('¿Eliminar este pedido?', 'Eliminar')) && run(() => db.deleteOrder(o.id))}
                    >
                      Eliminar
                    </Button>
                  </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
