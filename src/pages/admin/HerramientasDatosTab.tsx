import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { Button, Field, Input } from '../../components/ui'
import { useData } from '../../lib/data'
import { clearCatalog, clearOrders } from '../../lib/limpieza'

type ToolAction = { key: string; title: string; text: string; button: string; confirm: boolean; run: () => Promise<void>; done: string }

export function HerramientasDatosTab() {
  const { refresh } = useData()
  const [pending, setPending] = useState<ToolAction | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const actions: ToolAction[] = [
    { key: 'orders', title: 'Borrar todos los pedidos', text: 'Elimina el historial completo de pedidos. El catálogo y los clientes quedan como están.', button: 'Borrar pedidos', confirm: true, run: clearOrders, done: 'Pedidos borrados.' },
    { key: 'catalog', title: 'Borrar catálogo y pedidos', text: 'Elimina todos los productos, las categorías y los pedidos. Los clientes y sus cuentas no se tocan.', button: 'Borrar todo', confirm: true, run: clearCatalog, done: 'Catálogo y pedidos borrados.' },
  ]

  async function execute(a: ToolAction) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await a.run()
      await refresh()
      setMessage(a.done)
      setPending(null)
      setTyped('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {message && <p role="status" className="mb-3 rounded-lg bg-mark px-3 py-2 font-semibold">{message}</p>}
      {error && <p role="alert" className="mb-3 text-stamp">{error}</p>}
      <ul className="space-y-3">
        {actions.map((a) => (
          <li key={a.key} className="rounded-xl border-2 border-line bg-sheet p-4">
            <p className="font-bold">{a.title}</p>
            <p className="mt-1 text-ink-soft">{a.text}</p>
            <Button
              variant={a.confirm ? 'danger' : 'ghost'}
              className="mt-3"
              disabled={busy}
              onClick={() => (a.confirm ? (setPending(a), setTyped('')) : void execute(a))}
            >
              {busy && !a.confirm ? 'Cargando…' : a.button}
            </Button>
          </li>
        ))}
      </ul>
      {pending && (
        <Modal title={pending.title} onClose={() => setPending(null)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (typed.trim().toUpperCase() === 'BORRAR') void execute(pending)
            }}
          >
            <p>{pending.text} <span className="font-semibold">Esta acción no se puede deshacer.</span></p>
            <Field label="Escribe BORRAR para confirmar">
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" />
            </Field>
            <Button type="submit" variant="danger" className="h-12 w-full" disabled={busy || typed.trim().toUpperCase() !== 'BORRAR'}>
              {busy ? 'Borrando…' : pending.button}
            </Button>
          </form>
        </Modal>
      )}
    </>
  )
}
