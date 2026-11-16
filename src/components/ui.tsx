import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 font-semibold disabled:opacity-50 disabled:pointer-events-none'

export function Button({
  variant = 'primary',
  className = '',
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-accion text-white hover:bg-accion-dark h-12',
    ghost: 'border-2 border-line bg-sheet hover:border-ink h-10 text-sm',
    danger: 'border-2 border-stamp/40 text-stamp hover:bg-stamp hover:text-white h-10 text-sm',
  }[variant]
  return <button type="button" className={`${base} ${styles} ${className}`} {...p} />
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'h-12 w-full rounded-xl border-2 border-line bg-sheet px-3 text-base outline-none focus:border-accion'

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...p} />
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center">
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="mt-2 text-ink-soft">{children}</div>}
    </div>
  )
}

export function Spinner() {
  return <p className="py-12 text-center text-ink-soft">Cargando…</p>
}
