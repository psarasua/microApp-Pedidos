import { Button } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { db } from '../lib/db'

export function Account() {
  const { perfil, signOut } = useAuth()
  const cart = useCart()

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-extrabold">Mi cuenta</h1>
      <div className="rounded-xl border-2 border-line bg-sheet p-4">
        <p className="text-lg font-bold">{perfil?.nombre}</p>
        {perfil?.usuario && (
          <p className="mt-1 text-ink-soft">
            Tu usuario: <span className="rounded bg-mark px-2 py-0.5 font-extrabold tracking-wider text-ink">{perfil.usuario}</span>
          </p>
        )}
        {perfil?.telefono && <p className="text-ink-soft">Celular: {perfil.telefono}</p>}
        {perfil?.direccion && <p className="text-ink-soft">{perfil.direccion}</p>}
      </div>

      <div className="mt-4 rounded-xl border-2 border-line bg-sheet p-4">
        <p className="font-bold">Instala la app en tu celular</p>
        <p className="mt-1 text-ink-soft">Así queda en tu pantalla de inicio y no tienes que volver a entrar.</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li><span className="font-semibold">Android (Chrome):</span> menú ⋮ y luego «Instalar app».</li>
          <li><span className="font-semibold">iPhone (Safari):</span> botón Compartir y luego «Añadir a pantalla de inicio».</li>
        </ul>
      </div>

      {db.mode === 'supabase' && (
        <Button
          variant="ghost"
          className="mt-6 w-full"
          onClick={() => {
            cart.clear()
            void signOut()
          }}
        >
          Salir
        </Button>
      )}
    </div>
  )
}
