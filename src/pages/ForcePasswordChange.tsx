import { useState, type FormEvent } from 'react'
import { CredentialCard } from '../components/CredentialCard'
import { PasswordInput } from '../components/PasswordInput'
import { Button, Field, Input } from '../components/ui'
import { useAuth } from '../lib/auth'
import { invokeClientes } from '../lib/supabase'

/** Pantalla obligatoria tras un restablecimiento del admin: hay que cambiar la contraseña temporal. */
export function ForcePasswordChange() {
  const { perfil, refreshPerfil, signIn, signOut } = useAuth()
  const [nueva, setNueva] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [codigo, setCodigo] = useState<string | null>(null)
  const [ack, setAck] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (nueva.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
    if (nueva !== repeat) return setError('Las contraseñas no coinciden')
    setBusy(true)
    try {
      const res = await invokeClientes<{ ok: true; codigo: string }>({ accion: 'cambiar_clave', nueva })
      // Cambiar la contraseña cierra las sesiones abiertas: se vuelve a entrar para tener una sesión vigente.
      if (perfil) await signIn(perfil.usuario, nueva).catch(() => undefined)
      setCodigo(res.codigo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    setBusy(true)
    await refreshPerfil()
    setBusy(false)
  }

  if (codigo)
    return (
      <div className="grid min-h-dvh place-items-center px-4 py-8">
        <div className="w-full max-w-sm">
          <p className="mb-1 text-3xl font-extrabold tracking-tight">Contraseña cambiada</p>
          <p className="mb-6 text-ink-soft">Este es tu código de recuperación nuevo. El anterior ya no sirve.</p>
          <CredentialCard usuario={perfil?.usuario} codigo={codigo} onAckChange={setAck} />
          <Button className="mt-4 w-full" onClick={next} disabled={busy || !ack}>{busy ? 'Un momento…' : 'Continuar'}</Button>
        </div>
      </div>
    )

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-3xl font-extrabold tracking-tight">Elige una contraseña nueva</p>
        <p className="mb-6 text-ink-soft">El administrador restableció tu contraseña. Para seguir, elige una que solo tú conozcas.</p>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
          <PasswordInput id="nueva" label="Contraseña nueva" value={nueva} onChange={setNueva} autoComplete="new-password" autoFocus />
          <Field label="Repite la contraseña nueva">
            <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
          </Field>
          {error && <p role="alert" className="text-stamp">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Un momento…' : 'Guardar contraseña'}</Button>
        </form>
        <Button variant="ghost" className="mt-3 w-full" onClick={() => void signOut()}>Salir</Button>
      </div>
    </div>
  )
}
