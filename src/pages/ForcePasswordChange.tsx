import { useState, type FormEvent } from 'react'
import { AuthLayout } from '../components/AuthLayout'
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

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (nueva.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
    if (nueva !== repeat) return setError('Las contraseñas no coinciden')
    setBusy(true)
    try {
      await invokeClientes({ accion: 'cambiar_clave', nueva })
      // Cambiar la contraseña cierra las sesiones abiertas: se vuelve a entrar para tener una sesión vigente.
      if (perfil) await signIn(perfil.usuario, nueva).catch(() => undefined)
      await refreshPerfil()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Elige una contraseña nueva" subtitle="El administrador restableció tu contraseña. Para seguir, elige una que solo tú conozcas.">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
        <PasswordInput id="nueva" label="Contraseña nueva" value={nueva} onChange={setNueva} autoComplete="new-password" autoFocus />
        <Field label="Repite la contraseña nueva">
          <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
        </Field>
        {error && <p role="alert" className="text-stamp">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Un momento…' : 'Guardar contraseña'}</Button>
      </form>
      <Button variant="ghost" className="mt-3 w-full" onClick={() => void signOut()}>Salir</Button>
    </AuthLayout>
  )
}
