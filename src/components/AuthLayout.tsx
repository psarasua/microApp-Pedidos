import type { ReactNode } from 'react'
import { Logo } from './Logo'

/** Marco común de las pantallas de ingreso, registro y recuperación. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="w-full max-w-sm">
        <Logo tamano="text-3xl" className="mb-8" />
        <h1 className="mb-1 text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className="mb-6 text-ink-soft">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
