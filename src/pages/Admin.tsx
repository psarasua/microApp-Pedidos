import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../components/Modal'
import { ProductPhoto } from '../components/ProductPhoto'
import { Button, Empty, Field, Input, inputClass, Spinner } from '../components/ui'
import { useData } from '../lib/data'
import { db } from '../lib/db'
import { formatMoney } from '../lib/format'
import { resizeImage } from '../lib/image'
import { clearCatalog, clearOrders, loadSample } from '../lib/seed'
import type { Category, Perfil, Product } from '../lib/types'

type Tab = 'productos' | 'categorias' | 'clientes' | 'datos'

export function Admin() {
  const { loading } = useData()
  const [tab, setTab] = useState<Tab>('productos')
  const tabClass = (t: Tab) =>
    `h-11 flex-1 shrink-0 rounded-lg px-3 font-semibold ${tab === t ? 'bg-ink text-white' : 'border-2 border-line bg-sheet hover:border-ink'}`

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-extrabold">Administrar</h1>
      <div className="mb-5 flex gap-2 overflow-x-auto">
        <button className={tabClass('productos')} onClick={() => setTab('productos')}>Productos</button>
        <button className={tabClass('categorias')} onClick={() => setTab('categorias')}>Categorías</button>
        {db.mode === 'supabase' && <button className={tabClass('clientes')} onClick={() => setTab('clientes')}>Clientes</button>}
        <button className={tabClass('datos')} onClick={() => setTab('datos')}>Datos</button>
      </div>
      {loading ? <Spinner /> : tab === 'productos' ? <Products /> : tab === 'categorias' ? <Categories /> : tab === 'clientes' ? <Clients /> : <DataTools />}
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

const estadoStyle: Record<Perfil['estado'], string> = {
  pendiente: 'bg-mark text-ink',
  aprobado: 'bg-ink text-white',
  bloqueado: 'bg-stamp text-white',
}

function Clients() {
  const [clients, setClients] = useState<Perfil[] | null>(null)
  const [resetting, setResetting] = useState<Perfil | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const list = await db.listClientes()
      const order = { pendiente: 0, aprobado: 1, bloqueado: 2 }
      setClients(list.sort((a, b) => order[a.estado] - order[b.estado] || a.nombre.localeCompare(b.nombre, 'es')))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los clientes')
      setClients([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function setEstado(c: Perfil, estado: Perfil['estado']) {
    setError('')
    try {
      await db.setClienteEstado(c.id, estado)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el cliente')
    }
  }

  if (!clients) return <Spinner />
  return (
    <>
      {error && <p role="alert" className="mb-3 text-stamp">{error}</p>}
      {clients.length === 0 ? (
        <Empty title="Todavía no hay clientes">Cuando alguien cree su cuenta aparece acá para que lo apruebes.</Empty>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id} className="rounded-xl border-2 border-line bg-sheet p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.nombre}</p>
                  <p className="text-sm text-ink-soft">
                    Usuario <span className="rounded bg-mark px-1.5 font-bold tracking-wider text-ink">{c.usuario}</span>
                    {c.telefono && ` · Cel. ${c.telefono}`}
                  </p>
                  {c.direccion && <p className="truncate text-sm text-ink-soft">{c.direccion}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${estadoStyle[c.estado]}`}>{c.estado}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.estado !== 'aprobado' && <Button onClick={() => setEstado(c, 'aprobado')} className="h-10 text-sm">Aprobar</Button>}
                {c.estado === 'aprobado' && (
                  <Button variant="danger" onClick={() => window.confirm(`¿Bloquear a ${c.nombre}?`) && setEstado(c, 'bloqueado')}>Bloquear</Button>
                )}
                <Button variant="ghost" onClick={() => setResetting(c)}>Cambiar contraseña</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {resetting && <ResetPassword client={resetting} onClose={() => setResetting(null)} />}
    </>
  )
}

function ResetPassword({ client, onClose }: { client: Perfil; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
    setBusy(true)
    setError('')
    try {
      await db.resetClave(client.id, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`Nueva contraseña para ${client.nombre}`} onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p>Contraseña cambiada. Compártesela al cliente por un medio privado, como un mensaje directo.</p>
          <Button className="w-full" onClick={onClose}>Listo</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nueva contraseña (mínimo 8 caracteres)">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="off" required />
          </Field>
          {error && <p role="alert" className="text-stamp">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</Button>
        </form>
      )}
    </Modal>
  )
}

type ToolAction = { key: string; title: string; text: string; button: string; confirm: boolean; run: () => Promise<void>; done: string }

function DataTools() {
  const { refresh } = useData()
  const [pending, setPending] = useState<ToolAction | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const actions: ToolAction[] = [
    { key: 'sample', title: 'Cargar datos de ejemplo', text: 'Agrega 3 categorías y 10 productos de ejemplo, sin duplicar los que ya existen. Los 3 pedidos de ejemplo se crean solo si todavía no hay pedidos.', button: 'Cargar ejemplos', confirm: false, run: loadSample, done: 'Datos de ejemplo cargados.' },
    { key: 'orders', title: 'Borrar todos los pedidos', text: 'Elimina el historial completo de pedidos. El catálogo y los clientes quedan como están.', button: 'Borrar pedidos', confirm: true, run: clearOrders, done: 'Pedidos borrados.' },
    { key: 'catalog', title: 'Borrar catálogo y pedidos', text: 'Elimina todos los productos, las categorías y los pedidos. Los clientes y sus cuentas no se tocan.', button: 'Borrar todo', confirm: true, run: clearCatalog, done: 'Catálogo y pedidos borrados.' },
  ]

  async function execute(a: ToolAction) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await a.run()
      await refresh()
      setMessage(a.done)
      setPending(null)
      setTyped('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {message && <p role="status" className="mb-3 rounded-lg bg-mark px-3 py-2 font-semibold">{message}</p>}
      {error && <p role="alert" className="mb-3 text-stamp">{error}</p>}
      <ul className="space-y-3">
        {actions.map((a) => (
          <li key={a.key} className="rounded-xl border-2 border-line bg-sheet p-4">
            <p className="font-bold">{a.title}</p>
            <p className="mt-1 text-ink-soft">{a.text}</p>
            <Button
              variant={a.confirm ? 'danger' : 'ghost'}
              className="mt-3"
              disabled={busy}
              onClick={() => (a.confirm ? (setPending(a), setTyped('')) : void execute(a))}
            >
              {busy && !a.confirm ? 'Cargando…' : a.button}
            </Button>
          </li>
        ))}
      </ul>
      {pending && (
        <Modal title={pending.title} onClose={() => setPending(null)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (typed.trim().toUpperCase() === 'BORRAR') void execute(pending)
            }}
          >
            <p>{pending.text} <span className="font-semibold">Esta acción no se puede deshacer.</span></p>
            <Field label="Escribe BORRAR para confirmar">
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" />
            </Field>
            <Button type="submit" variant="danger" className="h-12 w-full" disabled={busy || typed.trim().toUpperCase() !== 'BORRAR'}>
              {busy ? 'Borrando…' : pending.button}
            </Button>
          </form>
        </Modal>
      )}
    </>
  )
}
