import { useState, type FormEvent } from 'react'
import { CredentialCard } from '../components/CredentialCard'
import { Modal } from '../components/Modal'
import { PasswordInput } from '../components/PasswordInput'
import { Button, Field, Input } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { db } from '../lib/db'
import { invokeClientes } from '../lib/supabase'

type Dialog = 'clave' | 'codigo' | null

export function Account() {
  const { perfil, signOut } = useAuth()
  const cart = useCart()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [notice, setNotice] = useState('')

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-extrabold">Mi cuenta</h1>
      {notice && <p role="status" className="mb-3 rounded-lg bg-mark px-3 py-2 font-semibold">{notice}</p>}
      <div className="rounded-xl border-2 border-line bg-sheet p-4">
        <p className="text-lg font-bold">{perfil?.nombre}</p>
        {perfil?.usuario && (
          <p className="mt-1 text-ink-soft">
            Tu usuario: <span className="rounded bg-mark px-2 py-0.5 font-extrabold tracking-wider text-ink">{perfil.usuario}</span>
          </p>
        )}
        {perfil?.telefono && <p className="text-ink-soft">Celular: {perfil.telefono}</p>}
        {perfil?.direccion && <p className="text-ink-soft">{perfil.direccion}</p>}
      </div>

      {db.mode === 'supabase' && (
        <div className="mt-4 rounded-xl border-2 border-line bg-sheet p-4">
          <p className="font-bold">Seguridad</p>
          <p className="mt-1 text-ink-soft">Con tu código de recuperación puedes cambiar la contraseña si la olvidas, sin pedir ayuda.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => { setNotice(''); setDialog('clave') }}>Cambiar mi contraseña</Button>
            <Button variant="ghost" onClick={() => { setNotice(''); setDialog('codigo') }}>Generar código nuevo</Button>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border-2 border-line bg-sheet p-4">
        <p className="font-bold">Instala la app en tu celular</p>
        <p className="mt-1 text-ink-soft">Así queda en tu pantalla de inicio y no tienes que volver a entrar.</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li><span className="font-semibold">Android (Chrome):</span> menú ⋮ y luego «Instalar app».</li>
          <li><span className="font-semibold">iPhone (Safari):</span> botón Compartir y luego «Añadir a pantalla de inicio».</li>
        </ul>
      </div>

      {db.mode === 'supabase' && (
        <Button
          variant="ghost"
          className="mt-6 w-full"
          onClick={() => {
            cart.clear()
            void signOut()
          }}
        >
          Salir
        </Button>
      )}

      {dialog === 'clave' && <ChangePassword usuario={perfil?.usuario} onClose={() => setDialog(null)} onDone={() => { setDialog(null); setNotice('Contraseña cambiada.') }} />}
      {dialog === 'codigo' && <NewCode usuario={perfil?.usuario} onClose={() => setDialog(null)} />}
    </div>
  )
}

function ChangePassword({ usuario, onClose, onDone }: { usuario?: string; onClose: () => void; onDone: () => void }) {
  const { signIn } = useAuth()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (nueva.length < 8) return setError('La contraseña nueva debe tener al menos 8 caracteres')
    if (nueva !== repeat) return setError('Las contraseñas nuevas no coinciden')
    setBusy(true)
    try {
      await invokeClientes({ accion: 'cambiar_clave', actual, nueva })
      // Cambiar la contraseña cierra las sesiones abiertas: se vuelve a entrar para tener una sesión vigente.
      if (usuario) await signIn(usuario, nueva).catch(() => undefined)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
      setBusy(false)
    }
  }

  return (
    <Modal title="Cambiar mi contraseña" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <PasswordInput id="actual" label="Contraseña actual" value={actual} onChange={setActual} autoComplete="current-password" autoFocus />
        <PasswordInput id="nueva" label="Contraseña nueva" value={nueva} onChange={setNueva} autoComplete="new-password" />
        <Field label="Repite la contraseña nueva">
          <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
        </Field>
        {error && <p role="alert" className="text-stamp">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</Button>
      </form>
    </Modal>
  )
}

function NewCode({ usuario, onClose }: { usuario?: string; onClose: () => void }) {
  const [actual, setActual] = useState('')
  const [codigo, setCodigo] = useState<string | null>(null)
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await invokeClientes<{ ok: true; codigo: string }>({ accion: 'nuevo_codigo', actual })
      setCodigo(res.codigo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el código')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Código de recuperación" onClose={onClose}>
      {codigo ? (
        <div className="space-y-4">
          <p>Este código reemplaza al anterior, que ya no sirve.</p>
          <CredentialCard usuario={usuario} codigo={codigo} onAckChange={setAck} />
          <Button className="w-full" onClick={onClose} disabled={!ack}>Listo</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p>Por seguridad, confirma tu contraseña. El código que tengas dejará de servir.</p>
          <PasswordInput id="actual" label="Contraseña actual" value={actual} onChange={setActual} autoComplete="current-password" autoFocus />
          {error && <p role="alert" className="text-stamp">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Generando…' : 'Generar código nuevo'}</Button>
        </form>
      )}
    </Modal>
  )
}
