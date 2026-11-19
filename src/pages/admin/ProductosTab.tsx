import { useMemo, useState } from 'react'
import { ProductoForm } from './ProductoForm'
import { confirmar } from '../../components/confirmar'
import { ProductPhoto } from '../../components/ProductPhoto'
import { Button, Empty, Input } from '../../components/ui'
import { useData } from '../../lib/data'
import { db } from '../../lib/db'
import { formatPrice, normalizar } from '../../lib/format'
import { type Product } from '../../lib/types'

export function ProductosTab() {
  const { products, categories, refresh } = useData()
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [q, setQ] = useState('')
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? 'Sin categoría'

  const shown = useMemo(() => {
    const words = normalizar(q).split(/\s+/).filter(Boolean)
    return products.filter((p) => {
      const text = normalizar(`${p.name} ${p.codigo}`)
      return words.every((w) => text.includes(w))
    })
  }, [products, q])
  const sinPrecio = products.filter((p) => p.price <= 0).length

  async function remove(p: Product) {
    if (!(await confirmar(`¿Eliminar "${p.name}"? Los pedidos anteriores se conservan.`, 'Eliminar'))) return
    await db.deleteProduct(p.id)
    await refresh()
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input type="search" placeholder="Buscar por nombre o código" aria-label="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button className="shrink-0" onClick={() => setEditing('new')}>Nuevo producto</Button>
      </div>
      {products.length > 0 && (
        <p className="mb-3 text-sm text-ink-soft">
          {shown.length === products.length ? `${products.length} productos` : `${shown.length} de ${products.length} productos`}
          {sinPrecio > 0 && ` · ${sinPrecio} sin precio`}
        </p>
      )}
      {products.length === 0 ? (
        <Empty title="No hay productos">Crea el primero con el botón de arriba.</Empty>
      ) : shown.length === 0 ? (
        <Empty title="No hay productos con esa búsqueda" />
      ) : (
        <ul className="space-y-2">
          {shown.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-sheet p-3">
              <ProductPhoto src={p.image_url} alt={p.name} className="h-16 w-16 shrink-0 rounded-xl border border-line" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-semibold leading-snug">{p.name}</p>
                <p className="truncate text-sm text-ink-soft">{p.codigo && `Cód. ${p.codigo} · `}{catName(p.category_id)}</p>
                <p className={p.price > 0 ? 'font-bold' : 'text-sm font-semibold text-stamp'}>{formatPrice(p.price)}</p>
              </div>
              <Button variant="ghost" onClick={() => setEditing(p)}>Editar</Button>
              <Button variant="danger" onClick={() => remove(p)} aria-label={`Eliminar ${p.name}`}>Eliminar</Button>
            </li>
          ))}
        </ul>
      )}
      {editing && <ProductoForm product={editing === 'new' ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={refresh} />}
    </>
  )
}
