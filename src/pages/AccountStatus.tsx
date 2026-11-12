import { useState } from 'react'
import { Button } from '../components/ui'
import { useAuth } from '../lib/auth'

/** Pantalla para cuentas que todavía no pueden pedir: pendientes, bloqueadas o sin perfil. */
export function AccountStatus() {
  const { perfil, refreshPerfil, signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  const content =
    perfil?.estado === 'bloqueado'
      ? { title: 'Tu cuenta está bloqueada', text: 'Comunícate con el administrador para volver a usar la app.' }
      : perfil
        ? { title: 'Tu cuenta está pendiente de aprobación', text: 'Cuando el administrador la apruebe vas a poder ver el catálogo y hacer pedidos.' }
        : { title: 'No encontramos tu cuenta', text: 'Sal y vuelve a entrar. Si sigue igual, comunícate con el administrador.' }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-extrabold">{content.title}</h1>
        {perfil && <p className="mt-1 font-semibold">{perfil.nombre}</p>}
        <p className="mt-2 text-ink-soft">{content.text}</p>
        <div className="mt-6 space-y-2">
          {perfil?.estado === 'pendiente' && (
            <Button
              className="w-full"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                await refreshPerfil()
                setBusy(false)
              }}
            >
              {busy ? 'Revisando…' : 'Revisar de nuevo'}
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => void signOut()}>Salir</Button>
        </div>
      </div>
    </div>
  )
}
