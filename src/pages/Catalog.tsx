import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductPhoto } from '../components/ProductPhoto'
import { Stepper } from '../components/Stepper'
import { Empty, Input, Spinner } from '../components/ui'
import { useCart } from '../lib/cart'
import { useData } from '../lib/data'
import { formatMoney } from '../lib/format'

export function Catalog() {
  const { products, categories, loading } = useData()
  const cart = useCart()
  const [cat, setCat] = useState<string | 'all'>('all')
  const [q, setQ] = useState('')

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return products.filter(
      (p) => (cat === 'all' || p.category_id === cat) && (!term || p.name.toLowerCase().includes(term)),
    )
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

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 space-y-3 bg-paper/95 px-4 pb-3 pt-1 backdrop-blur md:-mx-8 md:px-8">
        <Input type="search" placeholder="Buscar producto" aria-label="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <button className={chip(cat === 'all')} onClick={() => setCat('all')}>Todos</button>
          {categories.map((c) => (
            <button key={c.id} className={chip(cat === c.id)} onClick={() => setCat(c.id)}>{c.name}</button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty title="No hay productos con ese filtro" />
      ) : (
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => {
            const n = cart.qty(p.id)
            return (
              <li key={p.id} className="flex flex-col">
                <ProductPhoto src={p.image_url} alt={p.name} className={`aspect-square w-full rounded-xl ${n ? 'ring-4 ring-mark' : ''}`} />
                <p className="mt-2 font-semibold leading-tight">{p.name}</p>
                {p.description && <p className="line-clamp-2 text-sm text-ink-soft">{p.description}</p>}
                <p className="mt-1 text-lg font-extrabold tabular-nums">{formatMoney(p.price)}</p>
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
  )
}
