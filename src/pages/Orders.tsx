import { useState } from 'react'
import { Button, Empty, Spinner } from '../components/ui'
import { useData } from '../lib/data'
import { db } from '../lib/db'
import { formatDate, formatMoney } from '../lib/format'
import type { Order, OrderStatus } from '../lib/types'

const STATUSES: OrderStatus[] = ['pendiente', 'enviado', 'entregado']
const statusStyle: Record<OrderStatus, string> = {
  pendiente: 'bg-mark text-ink',
  enviado: 'bg-carbon text-white',
  entregado: 'bg-ink text-white',
}

const orderTotal = (o: Order) => o.items.reduce((s, i) => s + i.price * i.quantity, 0)

function whatsappText(o: Order) {
  const lines = o.items.map((i) => `• ${i.quantity} × ${i.name} — ${formatMoney(i.price * i.quantity)}`)
  const text = [`Pedido del ${formatDate(o.created_at)}`, ...lines, `Total: ${formatMoney(orderTotal(o))}`, o.notes && `Notas: ${o.notes}`]
    .filter(Boolean)
    .join('\n')
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function Orders() {
  const { orders, loading, refresh } = useData()
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function run(fn: () => Promise<void>) {
    setError('')
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción')
    }
  }

  if (loading) return <Spinner />
  if (orders.length === 0) return <Empty title="Aún no hay pedidos">Los pedidos confirmados aparecen acá.</Empty>

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-extrabold">Historial</h1>
      {error && <p role="alert" className="mb-3 text-stamp">{error}</p>}
      <ul className="space-y-3">
        {orders.map((o) => {
          const isOpen = open === o.id
          return (
            <li key={o.id} className="rounded-xl border-2 border-line bg-sheet">
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : o.id)} aria-expanded={isOpen}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{formatDate(o.created_at)}</p>
                  <p className="text-sm text-ink-soft">{o.items.reduce((s, i) => s + i.quantity, 0)} artículos</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyle[o.status]}`}>{o.status}</span>
                <span className="w-24 text-right text-lg font-extrabold">{formatMoney(orderTotal(o))}</span>
              </button>
              {isOpen && (
                <div className="border-t-2 border-dashed border-line p-4">
                  <ul className="space-y-1">
                    {o.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-3">
                        <span>{i.quantity} × {i.name}</span>
                        <span className="font-semibold">{formatMoney(i.price * i.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  {o.notes && <p className="mt-3 rounded-lg bg-paper p-3 text-sm">{o.notes}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
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
                      onClick={() => window.confirm('¿Eliminar este pedido?') && run(() => db.deleteOrder(o.id))}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
