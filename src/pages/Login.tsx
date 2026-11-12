import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Field, Input } from '../components/ui'
import { soloDigitos, useAuth } from '../lib/auth'

export function Login({ mode }: { mode: 'entrar' | 'registro' }) {
  const { signIn, register } = useAuth()
  const registro = mode === 'registro'
  const [usuario, setUsuario] = useState('')
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (registro) {
      if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
      if (password !== repeat) return setError('Las contraseñas no coinciden')
    }
    setBusy(true)
    try {
      if (registro) await register({ usuario, nombre, direccion, password })
      else await signIn(usuario, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-3xl font-extrabold tracking-tight">Pedidos</p>
        <p className="mb-6 text-ink-soft">{registro ? 'Crea tu cuenta para hacer pedidos.' : 'Entra con tu número de celular.'}</p>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
          {registro && (
            <>
              <Field label="Nombre"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" required /></Field>
              <Field label="Dirección (opcional)"><Input value={direccion} onChange={(e) => setDireccion(e.target.value)} autoComplete="street-address" /></Field>
            </>
          )}
          <Field label="Número de celular">
            <Input
              inputMode="numeric"
              autoComplete="username"
              placeholder="099123456"
              value={usuario}
              onChange={(e) => setUsuario(soloDigitos(e.target.value))}
              required
              minLength={8}
              maxLength={15}
            />
          </Field>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-ink-soft">Contraseña</label>
            <div className="relative">
              <Input
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete={registro ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 w-full rounded-lg border-2 border-line bg-sheet pl-3 pr-24 text-base outline-none focus:border-carbon"
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="absolute right-1 top-1 h-10 rounded-md px-3 text-sm font-semibold text-carbon">
                {show ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          {registro && (
            <Field label="Repite la contraseña">
              <Input type={show ? 'text' : 'password'} autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
            </Field>
          )}
          {error && <p role="alert" className="text-stamp">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Un momento…' : registro ? 'Crear cuenta' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-4 text-center text-ink-soft">
          {registro ? '¿Ya tienes cuenta? ' : '¿Primera vez? '}
          <Link to={registro ? '/' : '/registro'} className="font-semibold text-carbon underline">
            {registro ? 'Entrar' : 'Crear cuenta'}
          </Link>
        </p>
      </div>
    </div>
  )
}
