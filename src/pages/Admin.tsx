import { useState, type FormEvent } from 'react'
import { Modal } from '../components/Modal'
import { ProductPhoto } from '../components/ProductPhoto'
import { Button, Empty, Field, Input, inputClass, Spinner } from '../components/ui'
import { useData } from '../lib/data'
import { db } from '../lib/db'
import { formatMoney } from '../lib/format'
import { resizeImage } from '../lib/image'
import type { Category, Product } from '../lib/types'

type Tab = 'productos' | 'categorias'

export function Admin() {
  const { loading } = useData()
  const [tab, setTab] = useState<Tab>('productos')
  const tabClass = (t: Tab) =>
    `h-11 flex-1 rounded-lg font-semibold ${tab === t ? 'bg-ink text-white' : 'border-2 border-line bg-sheet hover:border-ink'}`

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-extrabold">Administrar</h1>
      <div className="mb-5 flex gap-2">
        <button className={tabClass('productos')} onClick={() => setTab('productos')}>Productos</button>
        <button className={tabClass('categorias')} onClick={() => setTab('categorias')}>Categorías</button>
      </div>
      {loading ? <Spinner /> : tab === 'productos' ? <Products /> : <Categories />}
    </div>
  )
}

function Products() {
  const { products, categories, refresh } = useData()
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? 'Sin categoría'

  async function remove(p: Product) {
    if (!window.confirm(`¿Eliminar "${p.name}"? Los pedidos anteriores se conservan.`)) return
    await db.deleteProduct(p.id)
    await refresh()
  }

  return (
    <>
      <Button className="mb-4 w-full sm:w-auto" onClick={() => setEditing('new')}>Nuevo producto</Button>
      {products.length === 0 ? (
        <Empty title="No hay productos">Crea el primero con el botón de arriba.</Empty>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border-2 border-line bg-sheet p-3">
              <ProductPhoto src={p.image_url} alt={p.name} className="h-16 w-16 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="truncate text-sm text-ink-soft">{catName(p.category_id)}</p>
                <p className="font-bold">{formatMoney(p.price)}</p>
              </div>
              <Button variant="ghost" onClick={() => setEditing(p)}>Editar</Button>
              <Button variant="danger" onClick={() => remove(p)} aria-label={`Eliminar ${p.name}`}>Eliminar</Button>
            </li>
          ))}
        </ul>
      )}
      {editing && <ProductForm product={editing === 'new' ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={refresh} />}
    </>
  )
}

function ProductForm({ product, categories, onClose, onSaved }: { product: Product | null; categories: Category[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '')
  const [image, setImage] = useState<string | null>(product?.image_url ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pickImage(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      setImage(await db.uploadImage(await resizeImage(file)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto')
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = Number(price.replace(',', '.'))
    if (!name.trim()) return setError('Escribe el nombre del producto')
    if (!Number.isFinite(value) || value < 0) return setError('El precio no es válido')
    setBusy(true)
    try {
      await db.saveProduct({
        id: product?.id,
        name: name.trim(),
        description: description.trim(),
        price: value,
        image_url: image,
        category_id: categoryId || null,
      })
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setBusy(false)
    }
  }

  return (
    <Modal title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-4">
          <ProductPhoto src={image} alt={name || 'Producto'} className="h-24 w-24 shrink-0 rounded-xl" />
          <div className="space-y-2">
            <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border-2 border-line px-4 text-sm font-semibold hover:border-ink focus-within:outline-3 focus-within:outline-carbon">
              {image ? 'Cambiar foto' : 'Agregar foto'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickImage(e.target.files?.[0])} />
            </label>
            {image && (
              <button type="button" className="block text-sm font-semibold text-stamp" onClick={() => setImage(null)}>
                Quitar foto
              </button>
            )}
          </div>
        </div>
        <Field label="Nombre"><Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field>
        <Field label="Descripción (opcional)">
          <textarea className={`${inputClass} h-20 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio"><Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required /></Field>
          <Field label="Categoría">
            <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        {error && <p role="alert" className="text-stamp">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Guardando…' : 'Guardar producto'}</Button>
      </form>
    </Modal>
  )
}

function Categories() {
  const { categories, products, refresh } = useData()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState('')

  async function run(fn: () => Promise<void>) {
    setError('')
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción')
    }
  }

  const count = (id: string) => products.filter((p) => p.category_id === id).length

  return (
    <>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          void run(async () => {
            await db.saveCategory({ name: name.trim() })
            setName('')
          })
        }}
      >
        <Input aria-label="Nombre de la nueva categoría" placeholder="Nueva categoría" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" className="shrink-0">Agregar</Button>
      </form>
      {error && <p role="alert" className="mb-3 text-stamp">{error}</p>}
      {categories.length === 0 ? (
        <Empty title="No hay categorías">Crea una para ordenar tus productos.</Empty>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border-2 border-line bg-sheet p-3">
              {editing?.id === c.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!editing.name.trim()) return
                    void run(async () => {
                      await db.saveCategory({ id: c.id, name: editing.name.trim() })
                      setEditing(null)
                    })
                  }}
                >
                  <Input aria-label="Nombre de la categoría" value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} autoFocus />
                  <Button type="submit" className="shrink-0">Guardar</Button>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="text-sm text-ink-soft">{count(c.id)} productos</p>
                  </div>
                  <Button variant="ghost" onClick={() => setEditing({ id: c.id, name: c.name })}>Editar</Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      window.confirm(`¿Eliminar "${c.name}"? Sus productos quedan sin categoría.`) && run(() => db.deleteCategory(c.id))
                    }
                  >
                    Eliminar
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
