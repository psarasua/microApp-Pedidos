import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Button, Field, Input } from '../components/ui'
import { invokeClientes } from '../lib/supabase'

/** Olvidé mi usuario: se envía el ID al correo de la cuenta. */
export function ForgotUser() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await invokeClientes({ accion: 'olvide_usuario', email: email.trim().toLowerCase() })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo')
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <AuthLayout title="Revisa tu correo" subtitle="Si ese correo tiene una cuenta, le enviamos el usuario. Si no llega, revisa la carpeta de spam.">
        <Link to="/" className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-carbon px-4 font-semibold text-white">Volver a entrar</Link>
      </AuthLayout>
    )

  return (
    <AuthLayout title="Recuperar usuario" subtitle="Escribe el correo con el que te registraste y te enviamos tu usuario.">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-line bg-sheet p-5">
        <Field label="Correo electrónico">
          <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoFocus />
        </Field>
        {error && <p role="alert" className="text-stamp">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Enviando…' : 'Enviarme mi usuario'}</Button>
      </form>
      <p className="mt-4 text-center">
        <Link to="/" className="font-semibold text-carbon underline">Volver a entrar</Link>
      </p>
    </AuthLayout>
  )
}
