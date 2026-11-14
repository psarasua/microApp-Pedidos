import type { ReactNode } from 'react'

/** Marco común de las pantallas de ingreso, registro y recuperación. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-3xl font-extrabold tracking-tight">{title}</p>
        {subtitle && <p className="mb-6 text-ink-soft">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
