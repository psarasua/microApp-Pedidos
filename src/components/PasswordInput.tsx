import { useState } from 'react'
import { Input } from './ui'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  autoFocus?: boolean
}

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export function PasswordInput({ id, label, value, onChange, autoComplete, autoFocus }: Props) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink-soft">{label}</label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="h-12 w-full rounded-lg border-2 border-line bg-sheet pl-3 pr-24 text-base outline-none focus:border-carbon"
        />
        <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="absolute right-1 top-1 h-10 rounded-md px-3 text-sm font-semibold text-carbon">
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </div>
  )
}
