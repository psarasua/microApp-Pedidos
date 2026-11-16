import { useEffect, useState } from 'react'
import { Button, Field, Input } from './ui'

/** Campo para el código de 6 dígitos que llega por correo. */
export function CodeField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <Field label="Código de 6 dígitos">
      <Input
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        required
        className="h-14 w-full rounded-lg border-2 border-line bg-sheet px-3 text-center font-mono text-2xl font-bold tracking-[0.4em] outline-none focus:border-accion"
      />
    </Field>
  )
}

/** Botón para pedir otro código; queda bloqueado un minuto después de cada envío. */
export function ResendCode({ onResend, seconds = 60 }: { onResend: () => Promise<void>; seconds?: number }) {
  const [left, setLeft] = useState(seconds)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  async function click() {
    setBusy(true)
    setMessage('')
    try {
      await onResend()
      setLeft(seconds)
      setMessage('Te enviamos un código nuevo. El anterior ya no sirve.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo reenviar el código')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="text-center">
      <Button variant="ghost" className="w-full" onClick={click} disabled={busy || left > 0}>
        {left > 0 ? `Reenviar código (${left} s)` : busy ? 'Enviando…' : 'Reenviar código'}
      </Button>
      {message && <p role="status" className="mt-2 text-sm text-ink-soft">{message}</p>}
    </div>
  )
}
