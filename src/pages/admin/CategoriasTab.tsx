import { useState } from 'react'
import { confirmar, elegir } from '../../components/confirmar'
import { Button, Empty, Input } from '../../components/ui'
import { useData } from '../../lib/data'
import { db } from '../../lib/db'

export function CategoriasTab() {
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
  const sinCategoria = products.filter((p) => !p.category_id).length

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
      {sinCategoria > 0 && (
        <p className="mb-3 rounded-lg bg-mark/30 p-3 text-sm font-semibold">
          {sinCategoria} {sinCategoria === 1 ? 'producto está' : 'productos están'} sin categoría: solo se ven en «Todos». Asígnalos desde Productos.
        </p>
      )}
      {categories.length === 0 ? (
        <Empty title="No hay categorías">Crea una para ordenar tus productos.</Empty>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-line bg-sheet p-3">
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
                    onClick={async () => {
                      const n = count(c.id)
                      if (n === 0) return (await confirmar(`¿Eliminar la categoría "${c.name}"?`, 'Eliminar')) && run(() => db.deleteCategory(c.id))
                      const accion = await elegir(`"${c.name}" tiene ${n} ${n === 1 ? 'producto' : 'productos'}. ¿Qué hacemos con ${n === 1 ? 'él' : 'ellos'}?`, [
                        { valor: 'todo', texto: `Eliminar categoría y ${n === 1 ? 'el producto' : 'los productos'}` },
                        { valor: 'categoria', texto: 'Solo la categoría (quedan sin categoría)' },
                      ])
                      if (accion) await run(() => db.deleteCategory(c.id, accion === 'todo'))
                    }}
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
