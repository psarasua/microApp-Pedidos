import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CredentialCard } from '../components/CredentialCard'
import { PasswordInput } from '../components/PasswordInput'
import { Button, Field, Input } from '../components/ui'
import { soloDigitos, useAuth } from '../lib/auth'
import { invokeClientes } from '../lib/supabase'

/** Olvidé mi contraseña: usuario + código de recuperación + contraseña nueva. */
export function Recover() {
  const { signIn } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [nuevoCodigo, setNuevoCodigo] = useState<string | null>(null)
  const [ack, setAck] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (nueva.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
    if (nueva !== repeat) return setError('Las contraseñas no coinciden')
    setBusy(true)
    try {
      const res = await invokeClientes<{ ok: true; codigo: string }>({ accion: 'recuperar', usuario, codigo, nueva })
      setNuevoCodigo(res.codigo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo recuperar la contraseña')
    } finally {
      setBusy(false)
    }
  }

  async function enter() {
    setBusy(true)
    setError('')
    try {
      await signIn(usuario, nueva)
    } catch {
      setError('Tu contraseña se cambió, pero no se pudo entrar. Vuelve a la pantalla de ingreso.')
      setBusy(false)
    }
  }

  if (nuevoCodigo)
    return (
      <div className="grid min-h-dvh place-items-center px-4 py-8">
        <div className="w-full max-w-sm">
          <p className="mb-1 text-3xl font-extrabold tracking-tight">Contraseña cambiada</p>
          <p className="mb-6 text-ink-soft">El código que usaste ya no sirve. Este es tu código nuevo.</p>
          <CredentialCard codigo={nuevoCodigo} onAckChange={setAck} />
          {error && <p role="alert" className="mt-3 text-stamp">{error}</p>}
          <Button className="mt-4 w-full" onClick={enter} disabled={busy || !ack}>{busy ? 'Un momento…' : 'Entrar'}</Button>
        </div>
      </div>
    )

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-3xl font-extrabold tracking-tight">Recuperar contraseña</p>
        <p className="mb-6 text-ink-soft">Usa tu usuario y el código de recuperación que te mostramos al crear tu cuenta.</p>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
          <Field label="Usuario">
            <Input inputMode="numeric" autoComplete="username" value={usuario} onChange={(e) => setUsuario(soloDigitos(e.target.value))} required minLength={5} maxLength={15} />
          </Field>
          <Field label="Código de recuperación">
            <Input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="XXXX-XXXX-XXXX"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              required
              maxLength={20}
              className="h-12 w-full rounded-lg border-2 border-line bg-sheet px-3 font-mono text-base tracking-wider outline-none focus:border-carbon"
            />
          </Field>
          <PasswordInput id="nueva" label="Contraseña nueva" value={nueva} onChange={setNueva} autoComplete="new-password" />
          <Field label="Repite la contraseña nueva">
            <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
          </Field>
          {error && <p role="alert" className="text-stamp">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Un momento…' : 'Cambiar contraseña'}</Button>
        </form>
        <p className="mt-4 text-center text-ink-soft">
          ¿Perdiste también el código? Pídele al administrador que restablezca tu contraseña.
        </p>
        <p className="mt-2 text-center">
          <Link to="/" className="font-semibold text-carbon underline">Volver a entrar</Link>
        </p>
      </div>
    </div>
  )
}
