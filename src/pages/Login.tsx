import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CredentialCard } from '../components/CredentialCard'
import { PasswordInput } from '../components/PasswordInput'
import { Button, Field, Input } from '../components/ui'
import { soloDigitos, useAuth } from '../lib/auth'

export function Login({ mode }: { mode: 'entrar' | 'registro' }) {
  const { signIn, register } = useAuth()
  const registro = mode === 'registro'
  const [usuario, setUsuario] = useState('')
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{ usuario: string; codigo: string } | null>(null)
  const [ack, setAck] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (registro) {
      if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
      if (password !== repeat) return setError('Las contraseñas no coinciden')
    }
    setBusy(true)
    try {
      if (registro) setCreated(await register({ nombre, direccion, telefono, password }))
      else await signIn(usuario, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción')
    } finally {
      setBusy(false)
    }
  }

  async function enter() {
    if (!created) return
    setBusy(true)
    setError('')
    try {
      await signIn(created.usuario, password)
    } catch {
      setError('La cuenta se creó, pero no se pudo entrar. Vuelve a la pantalla de ingreso y usa tu usuario.')
      setBusy(false)
    }
  }

  if (created)
    return (
      <div className="grid min-h-dvh place-items-center px-4 py-8">
        <div className="w-full max-w-sm">
          <p className="mb-1 text-3xl font-extrabold tracking-tight">Cuenta creada</p>
          <p className="mb-6 text-ink-soft">Guarda estos datos: el usuario lo necesitas cada vez que entres.</p>
          <CredentialCard usuario={created.usuario} codigo={created.codigo} onAckChange={setAck} />
          <p className="mt-4 text-ink-soft">Tu cuenta queda pendiente hasta que el administrador la apruebe.</p>
          {error && <p role="alert" className="mt-3 text-stamp">{error}</p>}
          <Button className="mt-4 w-full" onClick={enter} disabled={busy || !ack}>
            {busy ? 'Un momento…' : 'Entrar'}
          </Button>
        </div>
      </div>
    )

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-3xl font-extrabold tracking-tight">Pedidos</p>
        <p className="mb-6 text-ink-soft">{registro ? 'Crea tu cuenta para hacer pedidos. Te asignamos un usuario numérico.' : 'Entra con tu usuario y tu contraseña.'}</p>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
          {registro ? (
            <>
              <Field label="Nombre"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" required /></Field>
              <Field label="Celular (opcional)">
                <Input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" maxLength={20} placeholder="099123456" />
              </Field>
              <Field label="Dirección (opcional)"><Input value={direccion} onChange={(e) => setDireccion(e.target.value)} autoComplete="street-address" /></Field>
            </>
          ) : (
            <Field label="Usuario">
              <Input
                inputMode="numeric"
                autoComplete="username"
                placeholder="Ej.: 483920"
                value={usuario}
                onChange={(e) => setUsuario(soloDigitos(e.target.value))}
                required
                minLength={5}
                maxLength={15}
              />
            </Field>
          )}
          <PasswordInput id="password" label="Contraseña" value={password} onChange={setPassword} autoComplete={registro ? 'new-password' : 'current-password'} />
          {registro && (
            <Field label="Repite la contraseña">
              <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
            </Field>
          )}
          {error && <p role="alert" className="text-stamp">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Un momento…' : registro ? 'Crear cuenta' : 'Entrar'}
          </Button>
        </form>

        {!registro && (
          <p className="mt-4 text-center">
            <Link to="/recuperar" className="font-semibold text-carbon underline">Olvidé mi contraseña</Link>
          </p>
        )}
        <p className="mt-3 text-center text-ink-soft">
          {registro ? '¿Ya tienes cuenta? ' : '¿Primera vez? '}
          <Link to={registro ? '/' : '/registro'} className="font-semibold text-carbon underline">
            {registro ? 'Entrar' : 'Crear cuenta'}
          </Link>
        </p>
      </div>
    </div>
  )
}
