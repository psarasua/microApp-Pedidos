import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/ui'
import { db } from '../../lib/db'
import { nombreMostrado } from '../../lib/format'
import { type Perfil } from '../../lib/types'

export function RestablecerClaveModal({ client, onClose }: { client: Perfil; onClose: () => void }) {
  const [temporal, setTemporal] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function generate() {
    setBusy(true)
    setError('')
    try {
      setTemporal(await db.resetClave(client.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Usuario: ${client.usuario}\nContraseña temporal: ${temporal}`)
      setCopied(true)
    } catch {
      /* sin portapapeles: se anota a mano */
    }
  }

  return (
    <Modal title={`Contraseña de ${nombreMostrado(client)}`} onClose={onClose}>
      {temporal ? (
        <div className="space-y-4">
          <p>Pásale al cliente esta contraseña temporal. <span className="font-semibold">Solo se muestra ahora.</span> Al entrar, tendrá que elegir una nueva.</p>
          <p className="rounded-lg bg-mark px-3 py-3 text-center font-mono text-3xl font-extrabold tracking-widest">{temporal}</p>
          <p className="text-sm text-ink-soft">Su usuario es <span className="font-bold">{client.usuario}</span>.</p>
          <Button variant="ghost" className="w-full" onClick={copy}>{copied ? 'Copiado' : 'Copiar usuario y contraseña'}</Button>
          <Button className="w-full" onClick={onClose}>Listo</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p>Las contraseñas se guardan cifradas: nadie puede verlas, ni siquiera tú. Por eso se genera una <span className="font-semibold">temporal</span>, que verás una sola vez.</p>
          <p className="text-sm text-ink-soft">La contraseña actual de {nombreMostrado(client)} dejará de funcionar. Si el cliente conserva su código de recuperación, puede evitar este paso y recuperarla solo.</p>
          {error && <p role="alert" className="text-stamp">{error}</p>}
          <Button className="w-full" onClick={generate} disabled={busy}>{busy ? 'Generando…' : 'Generar contraseña temporal'}</Button>
        </div>
      )}
    </Modal>
  )
}
