import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { CodeField, ResendCode } from '../components/CodeField'
import { PasswordInput } from '../components/PasswordInput'
import { Button, Field, Input } from '../components/ui'
import { useAuth } from '../lib/auth'
import { invokeClientes } from '../lib/supabase'

type Step = 'datos' | 'codigo' | 'listo'

/** Registro en tres pasos: datos, código que llega al correo y confirmación con el usuario asignado. */
export function Register() {
  const { signIn } = useAuth()
  const [step, setStep] = useState<Step>('datos')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [codigo, setCodigo] = useState('')
  const [usuario, setUsuario] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const correo = email.trim().toLowerCase()

  async function sendData(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
    if (password !== repeat) return setError('Las contraseñas no coinciden')
    setBusy(true)
    try {
      await invokeClientes({ accion: 'registrar', email: correo, password })
      setCodigo('')
      setStep('codigo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    } finally {
      setBusy(false)
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await invokeClientes<{ ok: true; usuario: string }>({ accion: 'verificar_correo', email: correo, codigo })
      setUsuario(res.usuario)
      setStep('listo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar el código')
    } finally {
      setBusy(false)
    }
  }

  async function enter() {
    setBusy(true)
    setError('')
    try {
      await signIn(usuario, password)
    } catch {
      setError('La cuenta se creó, pero no se pudo entrar. Vuelve a la pantalla de ingreso y usa tu usuario.')
      setBusy(false)
    }
  }

  if (step === 'listo')
    return (
      <AuthLayout title="Cuenta creada" subtitle="Este es tu usuario. También te lo enviamos por correo.">
        <div className="rounded-2xl border-2 border-line bg-sheet p-5 text-center">
          <p className="text-sm font-semibold text-ink-soft">Tu usuario</p>
          <p className="mt-1 inline-block bg-mark px-3 text-5xl font-extrabold tracking-widest" aria-label={`Usuario ${usuario.split('').join(' ')}`}>
            {usuario}
          </p>
        </div>
        <p className="mt-4 text-ink-soft">Tu cuenta queda pendiente hasta que el administrador la apruebe.</p>
        {error && <p role="alert" className="mt-3 text-stamp">{error}</p>}
        <Button className="mt-4 w-full" onClick={enter} disabled={busy}>{busy ? 'Un momento…' : 'Entrar'}</Button>
      </AuthLayout>
    )

  if (step === 'codigo')
    return (
      <AuthLayout title="Revisa tu correo" subtitle={`Te enviamos un correo a ${correo}. Si es una cuenta nueva, trae un código que vence en 15 minutos; si ya tenías cuenta, te avisamos cómo entrar.`}>
        <form onSubmit={verify} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
          <CodeField value={codigo} onChange={setCodigo} autoFocus />
          {error && <p role="alert" className="text-stamp">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || codigo.length !== 6}>{busy ? 'Verificando…' : 'Verificar'}</Button>
        </form>
        <div className="mt-3">
          <ResendCode onResend={() => invokeClientes({ accion: 'reenviar_codigo', email: correo }).then(() => undefined)} />
        </div>
        <p className="mt-4 text-center text-ink-soft">
          ¿No te llega? Revisa la carpeta de spam o{' '}
          <button type="button" className="font-semibold text-accion underline" onClick={() => { setError(''); setStep('datos') }}>cambia el correo</button>.
        </p>
      </AuthLayout>
    )

  return (
    <AuthLayout title="Crear cuenta" subtitle="Para hacer pedidos. Te enviamos un código por correo para verificarlo.">
      <form onSubmit={sendData} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
        <Field label="Correo electrónico">
          <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoFocus />
        </Field>
        <PasswordInput id="password" label="Contraseña" value={password} onChange={setPassword} autoComplete="new-password" />
        <Field label="Repite la contraseña">
          <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
        </Field>
        {error && <p role="alert" className="text-stamp">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Enviando código…' : 'Crear cuenta'}</Button>
      </form>
      <p className="mt-4 text-center text-ink-soft">
        ¿Ya tienes cuenta? <Link to="/" className="font-semibold text-accion underline">Entrar</Link>
      </p>
    </AuthLayout>
  )
}
