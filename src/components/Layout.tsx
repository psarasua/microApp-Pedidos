import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { useData } from '../lib/data'
import { db } from '../lib/db'

const icon = {
  catalogo: <path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z" />,
  pedido: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
  historial: <path d="M12 7v5l3 2M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" />,
  admin: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-3-2 1-2-1-.3-2.3h-4L10 8 8 9 6 8 4 11l2 1v2l-2 1 2 3 2-1 2 1 .3 2.3h4L14 18l2-1 2 1 2-3-2-1z" />,
}

export function Layout() {
  const cart = useCart()
  const { count } = cart
  const { error } = useData()
  const { isAdmin, perfil, signOut } = useAuth()

  function logout() {
    cart.clear()
    void signOut()
  }

  const items = [
    { to: '/', label: 'Catálogo', icon: icon.catalogo, end: true },
    { to: '/pedido', label: 'Pedido', icon: icon.pedido, badge: count },
    { to: '/historial', label: isAdmin ? 'Recibidos' : 'Mis pedidos', icon: icon.historial },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: icon.admin }] : []),
  ]

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-line bg-ink p-5 text-white md:block">
        <div className="sticky top-5">
          <p className="mb-8 text-2xl font-extrabold tracking-tight">Pedidos</p>
          <nav className="flex flex-col gap-1">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-3 font-semibold ${isActive ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10'}`
                }
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">{i.icon}</svg>
                {i.label}
                {!!i.badge && <span className="ml-auto rounded-full bg-mark px-2 text-sm font-bold text-ink">{i.badge}</span>}
              </NavLink>
            ))}
          </nav>
          {perfil && db.mode === 'supabase' && (
            <div className="mt-8 px-3">
              <p className="truncate text-sm text-white/70">{perfil.nombre}</p>
              <button onClick={logout} className="mt-1 text-sm font-semibold text-white underline">Salir</button>
            </div>
          )}
          {db.mode === 'local' && (
            <p className="mt-8 rounded-lg bg-white/10 p-3 text-sm text-white/80">
              Modo local: los datos están solo en este dispositivo.
            </p>
          )}
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:px-8 md:pb-10">
        {db.mode === 'supabase' && (
          <header className="mb-3 flex items-center justify-between md:hidden">
            <span className="text-xl font-extrabold tracking-tight">Pedidos</span>
            <button onClick={logout} className="h-10 rounded-lg px-3 text-sm font-semibold text-ink-soft underline">Salir</button>
          </header>
        )}
        {error && (
          <p role="alert" className="mb-4 rounded-lg border-2 border-stamp bg-stamp/10 p-3 text-stamp">
            {error}
          </p>
        )}
        <Outlet />
      </main>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-sheet md:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${isActive ? 'text-carbon' : 'text-ink-soft'}`
            }
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">{i.icon}</svg>
            {i.label}
            {!!i.badge && (
              <span className="absolute right-[26%] top-1 min-w-5 rounded-full bg-mark px-1 text-center text-xs font-bold text-ink">{i.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
