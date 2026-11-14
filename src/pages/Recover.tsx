import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { CodeField, ResendCode } from '../components/CodeField'
import { PasswordInput } from '../components/PasswordInput'
import { Button, Field, Input } from '../components/ui'
import { useAuth } from '../lib/auth'
import { invokeClientes } from '../lib/supabase'

/** Olvidé mi contraseña: se pide el usuario o el correo, llega un código y, con el código correcto, se elige la nueva. */
export function Recover() {
  const { signIn } = useAuth()
  const [step, setStep] = useState<'pedir' | 'confirmar'>('pedir')
  const [identificador, setIdentificador] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pedir = () => invokeClientes({ accion: 'recuperar_pedir', identificador }).then(() => undefined)

  async function ask(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await pedir()
      setCodigo('')
      setStep('confirmar')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el código')
    } finally {
      setBusy(false)
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (nueva.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
    if (nueva !== repeat) return setError('Las contraseñas no coinciden')
    setBusy(true)
    try {
      const res = await invokeClientes<{ ok: true; usuario: string }>({ accion: 'recuperar_confirmar', identificador, codigo, nueva })
      await signIn(res.usuario, nueva).catch(() => undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
      setBusy(false)
    }
  }

  if (step === 'confirmar')
    return (
      <AuthLayout title="Elige tu contraseña nueva" subtitle="Si existe una cuenta con esos datos, te enviamos un código al correo registrado. Vence en 15 minutos.">
        <form onSubmit={confirm} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
          <CodeField value={codigo} onChange={setCodigo} autoFocus />
          <PasswordInput id="nueva" label="Contraseña nueva" value={nueva} onChange={setNueva} autoComplete="new-password" />
          <Field label="Repite la contraseña nueva">
            <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
          </Field>
          {error && <p role="alert" className="text-stamp">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || codigo.length !== 6}>{busy ? 'Un momento…' : 'Cambiar contraseña'}</Button>
        </form>
        <div className="mt-3"><ResendCode onResend={pedir} /></div>
        <p className="mt-4 text-center text-ink-soft">
          ¿No te llega nada? Revisa el spam o pídele al administrador que restablezca tu contraseña.
        </p>
        <p className="mt-2 text-center">
          <button type="button" className="font-semibold text-carbon underline" onClick={() => { setError(''); setStep('pedir') }}>Usar otro usuario o correo</button>
        </p>
      </AuthLayout>
    )

  return (
    <AuthLayout title="Recuperar contraseña" subtitle="Escribe tu usuario o tu correo. Te enviamos un código para elegir una contraseña nueva.">
      <form onSubmit={ask} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
        <Field label="Usuario o correo">
          <Input autoComplete="username" value={identificador} onChange={(e) => setIdentificador(e.target.value)} required maxLength={254} autoFocus />
        </Field>
        {error && <p role="alert" className="text-stamp">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Enviando…' : 'Enviar código'}</Button>
      </form>
      <p className="mt-4 text-center">
        <Link to="/" className="font-semibold text-carbon underline">Volver a entrar</Link>
      </p>
    </AuthLayout>
  )
}
