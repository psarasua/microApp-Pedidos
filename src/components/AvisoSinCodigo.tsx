import { useAuth } from '../lib/auth'

/** Aviso para quien ya tiene cuenta aprobada pero todavía no tiene código y nombre de cliente: puede ver el catálogo, no pedir. */
export function AvisoSinCodigo({ className = '' }: { className?: string }) {
  const { puedePedir, perfil } = useAuth()
  if (puedePedir || !perfil || perfil.estado !== 'aprobado') return null
  return (
    <div role="status" className={`rounded-2xl border border-mark bg-mark/20 p-4 ${className}`}>
      <p className="font-bold">Todavía no puedes hacer pedidos</p>
      <p className="mt-1 text-sm">
        Tu cuenta no tiene código de cliente. Pídele al administrador que lo asigne: apenas lo haga vas a poder confirmar pedidos.
        Mientras tanto puedes mirar el catálogo y armar el pedido.
      </p>
    </div>
  )
}
