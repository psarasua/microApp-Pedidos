import { useEffect, useRef } from 'react'
import { formatMoney } from '../lib/format'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Logo } from './Logo'
import { useCart } from '../lib/cart'
import { useData } from '../lib/data'
import { db } from '../lib/db'

const icon = {
  catalogo: <path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z" />,
  pedido: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
  historial: <path d="M12 7v5l3 2M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" />,
  admin: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-3-2 1-2-1-.3-2.3h-4L10 8 8 9 6 8 4 11l2 1v2l-2 1 2 3 2-1 2 1 .3 2.3h4L14 18l2-1 2 1 2-3-2-1z" />,
}

/** Contador con un latido breve cada vez que cambia (no al cargar la página). */
function Insignia({ n, className, animar }: { n: number; className: string; animar: boolean }) {
  return (
    <span key={n} className={`${className} ${animar ? 'latido' : ''}`}>
      {n}
    </span>
  )
}

export function Layout() {
  const cart = useCart()
  const { count } = cart
  const { error, products } = useData()
  const total = cart.totalFor(products)
  const { isAdmin, perfil, signOut } = useAuth()
  const menu = useRef<HTMLDivElement>(null)
  const montado = useRef(false) // el latido no se dispara al cargar la página
  useEffect(() => {
    montado.current = true
  }, [])

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
  const enMenu = items.slice(2) // en PC, pedidos recibidos y administración viven en el menú

  const linkMenu = 'flex min-h-11 items-center gap-3 rounded-lg px-3 font-semibold hover:bg-paper'

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:px-8">
          <Link to="/" aria-label="Pedidos, inicio"><Logo /></Link>
          <div className="ml-auto flex items-center gap-1">
            <NavLink
              to="/pedido"
              className={`items-center gap-2 rounded-xl px-3 font-semibold hover:bg-line/60 ${count ? 'flex' : 'hidden md:flex'} h-11`}
              aria-label={count ? `Pedido, ${count} artículos${total > 0 ? `, total ${formatMoney(total)}` : ''}` : 'Pedido'}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">{icon.pedido}</svg>
              <span className="hidden md:inline">Pedido</span>
              {!!count && <Insignia animar={montado.current} n={count} className="rounded-full bg-mark px-2 text-sm font-bold text-ink" />}
              {total > 0 && <span className="font-display tabular-nums">{formatMoney(total)}</span>}
            </NavLink>
            <button
              type="button"
              popoverTarget="menu-cuenta"
              aria-label="Menú"
              className="grid h-11 w-11 place-items-center rounded-xl hover:bg-line/60"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        ref={menu}
        id="menu-cuenta"
        popover="auto"
        className="inset-auto right-4 top-16 m-0 w-64 rounded-2xl border border-line bg-sheet p-2 text-ink shadow-suave md:right-[max(2rem,calc((100vw-72rem)/2+2rem))]"
      >
        {perfil && db.mode === 'supabase' && (
          <div className="mb-1 border-b border-line px-3 pb-2 pt-1">
            <p className="truncate font-bold">{perfil.nombre}</p>
            <p className="text-sm text-ink-soft">Usuario {perfil.usuario}</p>
          </div>
        )}
        {enMenu.map((i) => (
          <NavLink key={i.to} to={i.to} className={`${linkMenu} hidden md:flex`} onClick={() => menu.current?.hidePopover()}>
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">{i.icon}</svg>
            {i.label}
          </NavLink>
        ))}
        {perfil && db.mode === 'supabase' ? (
          <button type="button" onClick={logout} className={`${linkMenu} w-full text-left`}>Salir</button>
        ) : (
          <p className="px-3 py-2 text-sm text-ink-soft">Modo local: los datos están solo en este dispositivo.</p>
        )}
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-10">
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
              `relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${isActive ? 'text-accion' : 'text-ink-soft'}`
            }
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">{i.icon}</svg>
            {i.label}
            {!!i.badge && (
              <Insignia animar={montado.current} n={i.badge} className="absolute right-[26%] top-1 min-w-5 rounded-full bg-mark px-1 text-center text-xs font-bold text-ink" />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
