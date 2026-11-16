import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { InstallTip } from '../components/InstallTip'
import { ProductPhoto } from '../components/ProductPhoto'
import { Stepper } from '../components/Stepper'
import { Empty, inputClass, Spinner } from '../components/ui'
import { useCart } from '../lib/cart'
import { useData } from '../lib/data'
import { formatPrice, normalizar } from '../lib/format'

export function Catalog() {
  const { products, categories, loading } = useData()
  const cart = useCart()
  const [cat, setCat] = useState<string | 'all'>('all')
  const [q, setQ] = useState('')
  // La lista es más rápida para pedir con un catálogo largo; las fotos ayudan a reconocer productos.
  const [vista, setVista] = useState<'lista' | 'cuadricula'>(() => {
    try {
      return localStorage.getItem('pedidos.vista') === 'cuadricula' ? 'cuadricula' : 'lista'
    } catch {
      return 'lista'
    }
  })
  function cambiarVista(v: 'lista' | 'cuadricula') {
    setVista(v)
    try {
      localStorage.setItem('pedidos.vista', v)
    } catch {
      /* se usa la vista solo en esta sesión */
    }
  }

  const visible = useMemo(() => {
    // Cada palabra escrita debe aparecer en el nombre, el código o la descripción.
    const words = normalizar(q).split(/\s+/).filter(Boolean)
    return products.filter((p) => {
      if (cat !== 'all' && p.category_id !== cat) return false
      const text = normalizar(`${p.name} ${p.codigo} ${p.description}`)
      return words.every((w) => text.includes(w))
    })
  }, [products, cat, q])

  if (loading) return <Spinner />

  if (products.length === 0)
    return (
      <Empty title="Todavía no hay productos">
        Carga el primero desde <Link to="/admin" className="font-semibold text-accion underline">Admin</Link>.
      </Empty>
    )

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${active ? 'border-accion bg-accion text-white' : 'border-line bg-sheet hover:border-accion/50'}`

  const cuenta = (id: string) => products.filter((p) => p.category_id === id).length
  const lado = (active: boolean) =>
    `flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left font-semibold ${active ? 'bg-accion-soft text-accion-dark' : 'hover:bg-line/50'}`

  return (
    <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <nav aria-label="Categorías" className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-line bg-sheet p-2 shadow-suave lg:block">
        <button className={lado(cat === 'all')} aria-current={cat === 'all' || undefined} onClick={() => setCat('all')}>
          <span>Todos</span>
          <span className={`text-sm tabular-nums ${cat === 'all' ? 'text-accion-dark' : 'text-ink-soft'}`}>{products.length}</span>
        </button>
        {categories.map((c) => (
          <button key={c.id} className={lado(cat === c.id)} aria-current={cat === c.id || undefined} onClick={() => setCat(c.id)}>
            <span className="truncate">{c.name}</span>
            <span className={`text-sm tabular-nums ${cat === c.id ? 'text-accion-dark' : 'text-ink-soft'}`}>{cuenta(c.id)}</span>
          </button>
        ))}
      </nav>
      <div>
      <InstallTip />
      <div className="sticky top-14 z-30 -mx-4 space-y-3 bg-paper/95 px-4 pb-3 pt-1 backdrop-blur md:-mx-8 md:px-8 lg:mx-0 lg:px-0">
        <div className="relative">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 fill-none stroke-ink-soft stroke-2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            name="buscar"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Buscar por nombre o código"
            aria-label="Buscar por nombre o código"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${inputClass} pl-11 shadow-suave`}
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 lg:hidden">
          <button className={chip(cat === 'all')} onClick={() => setCat('all')}>Todos</button>
          {categories.map((c) => (
            <button key={c.id} className={chip(cat === c.id)} onClick={() => setCat(c.id)}>{c.name}</button>
          ))}
        </div>
      </div>

      <div className="mb-3 mt-1 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft" aria-live="polite">{visible.length} {visible.length === 1 ? 'producto' : 'productos'}</p>
        <div className="flex gap-1" role="group" aria-label="Vista del catálogo">
          {(['lista', 'cuadricula'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vista === v}
              onClick={() => cambiarVista(v)}
              className={`h-10 rounded-xl px-3 text-sm font-semibold ${vista === v ? 'bg-accion-soft text-accion-dark' : 'text-ink-soft hover:bg-line/50'}`}
            >
              {v === 'lista' ? 'Lista' : 'Fotos'}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty title="No hay productos con ese filtro" />
      ) : vista === 'lista' ? (
        <ul className="space-y-2">
          {visible.map((p) => {
            const n = cart.qty(p.id)
            return (
              <li key={p.id} className={`flex items-center gap-3 rounded-2xl border bg-sheet p-3 transition-colors duration-150 ${n ? 'border-accion bg-accion-soft/40' : 'border-line'}`}>
                <ProductPhoto src={p.image_url} alt={p.name} className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-xl border border-line" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold leading-snug">{p.name}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {p.codigo && <span className="font-semibold text-accion">Cód. {p.codigo}</span>}
                    {p.codigo && ' · '}
                    <span className={`tabular-nums ${p.price > 0 ? 'font-bold text-ink' : ''}`}>{formatPrice(p.price)}</span>
                  </p>
                </div>
                <Stepper value={n} onChange={(v) => cart.setQty(p.id, v)} label={p.name} />
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
          {visible.map((p) => {
            const n = cart.qty(p.id)
            return (
              <li key={p.id} className="flex flex-col">
                <ProductPhoto src={p.image_url} alt={p.name} className={`aspect-square w-full rounded-2xl border ${n ? 'border-accion ring-2 ring-accion' : 'border-line'}`} />
                <p className="mt-2 font-semibold leading-tight">{p.name}</p>
                {p.codigo && <p className="text-xs font-semibold text-accion">Cód. {p.codigo}</p>}
                {p.description && <p className="line-clamp-2 text-sm text-ink-soft">{p.description}</p>}
                <p className={`mt-1 tabular-nums ${p.price > 0 ? 'text-lg font-extrabold' : 'text-sm font-semibold text-ink-soft'}`}>{formatPrice(p.price)}</p>
                <div className="mt-auto pt-2">
                  <Stepper value={n} onChange={(v) => cart.setQty(p.id, v)} label={p.name} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      </div>
    </div>
  )
}
