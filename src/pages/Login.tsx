import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import { Button, Field, Input } from '../components/ui'
import { soloDigitos, useAuth } from '../lib/auth'

export function Login() {
  const { signIn } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(soloDigitos(usuario), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar')
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Pedidos" subtitle="Entra con tu usuario y tu contraseña.">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
        <Field label="Usuario">
          <Input
            inputMode="numeric"
            autoComplete="username"
            placeholder="Ej.: 483920"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            maxLength={30}
          />
        </Field>
        {/\D/.test(usuario) && (
          <p className="-mt-2 text-sm text-ink-soft">
            Tu usuario es el número de 6 dígitos que te enviamos por correo. Si no lo recuerdas, usa «Olvidé mi usuario».
          </p>
        )}
        <PasswordInput id="password" label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p role="alert" className="text-stamp">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Un momento…' : 'Entrar'}</Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2">
        <Link to="/recuperar" className="font-semibold text-accion underline">Olvidé mi contraseña</Link>
        <Link to="/usuario" className="font-semibold text-accion underline">Olvidé mi usuario</Link>
        <p className="text-ink-soft">
          ¿Primera vez? <Link to="/registro" className="font-semibold text-accion underline">Crear cuenta</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
