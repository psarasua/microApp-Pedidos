import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { Button, Field, Input } from '../../components/ui'
import { db } from '../../lib/db'
import { nombreMostrado } from '../../lib/format'
import { type Perfil } from '../../lib/types'

/** El admin asigna el código (1 a 10 dígitos, único) y el nombre con que figura el cliente. Sin ambos el cliente no puede pedir. */
export function DatosClienteModal({ client, onClose, onSaved }: { client: Perfil; onClose: () => void; onSaved: () => Promise<void> }) {
  const [codigo, setCodigo] = useState(client.codigo_cliente ?? '')
  const [nombre, setNombre] = useState(client.nombre_cliente ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!/^\d{1,10}$/.test(codigo)) return setError('El código son entre 1 y 10 dígitos, solo números')
    if (nombre.trim().length < 2) return setError('Escribe el nombre del cliente')
    setBusy(true)
    setError('')
    try {
      await db.setClienteDatos(client.id, { codigo_cliente: codigo, nombre_cliente: nombre })
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setBusy(false)
    }
  }

  return (
    <Modal title={`Código de ${nombreMostrado(client)}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-soft">
          Sin código y nombre de cliente, {nombreMostrado(client)} no puede confirmar pedidos. El código viaja en el archivo de cada pedido.
        </p>
        <Field label="Código de cliente (hasta 10 dígitos)">
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} maxLength={10} inputMode="numeric" required autoFocus />
        </Field>
        <Field label="Nombre del cliente">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} required />
        </Field>
        {error && <p role="alert" className="text-stamp">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button>
      </form>
    </Modal>
  )
}
