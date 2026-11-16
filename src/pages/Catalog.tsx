import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { InstallTip } from '../components/InstallTip'
import { ProductPhoto } from '../components/ProductPhoto'
import { Stepper } from '../components/Stepper'
import { Empty, Input, Spinner } from '../components/ui'
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
        Carga el primero desde <Link to="/admin" className="font-semibold text-carbon underline">Admin</Link>.
      </Empty>
    )

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border-2 px-4 py-2 text-sm font-semibold ${active ? 'border-ink bg-ink text-white' : 'border-line bg-sheet hover:border-ink'}`

  const cuenta = (id: string) => products.filter((p) => p.category_id === id).length
  const lado = (active: boolean) =>
    `flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left font-semibold ${active ? 'bg-ink text-white' : 'hover:bg-line/60'}`

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-8">
      <div>
      <InstallTip />
      <div className="sticky top-0 z-30 -mx-4 space-y-3 bg-paper/95 px-4 pb-3 pt-1 backdrop-blur md:-mx-8 md:px-8 lg:mx-0 lg:px-0">
        <Input type="search" placeholder="Buscar por nombre o código" aria-label="Buscar por nombre o código" value={q} onChange={(e) => setQ(e.target.value)} />
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
              className={`h-10 rounded-lg px-3 text-sm font-semibold ${vista === v ? 'bg-ink text-white' : 'border-2 border-line bg-sheet hover:border-ink'}`}
            >
              {v === 'lista' ? 'Lista' : 'Fotos'}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty title="No hay productos con ese filtro" />
      ) : vista === 'lista' ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border-2 border-line bg-sheet">
          {visible.map((p) => {
            const n = cart.qty(p.id)
            return (
              <li key={p.id} className={`flex items-center gap-3 p-3 ${n ? 'bg-mark/15' : ''}`}>
                <ProductPhoto src={p.image_url} alt={p.name} className="h-16 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold leading-tight">{p.name}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {p.codigo && <span className="font-semibold text-carbon">Cód. {p.codigo}</span>}
                    {p.codigo && ' · '}
                    <span className={`tabular-nums ${p.price > 0 ? 'font-bold text-ink' : ''}`}>{formatPrice(p.price)}</span>
                  </p>
                </div>
                {n ? (
                  <Stepper value={n} onChange={(v) => cart.setQty(p.id, v)} label={p.name} />
                ) : (
                  <button
                    onClick={() => cart.setQty(p.id, 1)}
                    className="grid h-10 w-24 shrink-0 place-items-center rounded-lg border-2 border-ink font-bold hover:bg-ink hover:text-white active:scale-[0.98]"
                    aria-label={`Agregar ${p.name} al pedido`}
                  >
                    Agregar
                  </button>
                )}
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
                <ProductPhoto src={p.image_url} alt={p.name} className={`aspect-square w-full rounded-xl ${n ? 'ring-4 ring-mark' : ''}`} />
                <p className="mt-2 font-semibold leading-tight">{p.name}</p>
                {p.codigo && <p className="text-xs font-semibold text-carbon">Cód. {p.codigo}</p>}
                {p.description && <p className="line-clamp-2 text-sm text-ink-soft">{p.description}</p>}
                <p className={`mt-1 tabular-nums ${p.price > 0 ? 'text-lg font-extrabold' : 'text-sm font-semibold text-ink-soft'}`}>{formatPrice(p.price)}</p>
                <div className="mt-auto pt-2">
                  {n ? (
                    <Stepper value={n} onChange={(v) => cart.setQty(p.id, v)} label={p.name} />
                  ) : (
                    <button
                      onClick={() => cart.setQty(p.id, 1)}
                      className="h-10 w-full rounded-lg border-2 border-ink font-bold hover:bg-ink hover:text-white active:scale-[0.98]"
                      aria-label={`Agregar ${p.name} al pedido`}
                    >
                      Agregar
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      </div>

      <nav aria-label="Categorías" className="sticky top-5 hidden max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-xl border-2 border-line bg-sheet p-2 lg:block">
        <button className={lado(cat === 'all')} aria-current={cat === 'all' || undefined} onClick={() => setCat('all')}>
          <span>Todos</span>
          <span className={`text-sm tabular-nums ${cat === 'all' ? 'text-white/80' : 'text-ink-soft'}`}>{products.length}</span>
        </button>
        {categories.map((c) => (
          <button key={c.id} className={lado(cat === c.id)} aria-current={cat === c.id || undefined} onClick={() => setCat(c.id)}>
            <span className="truncate">{c.name}</span>
            <span className={`text-sm tabular-nums ${cat === c.id ? 'text-white/80' : 'text-ink-soft'}`}>{cuenta(c.id)}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
