import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { ProductPhoto } from '../../components/ProductPhoto'
import { Button, Field, Input, inputClass } from '../../components/ui'
import { db } from '../../lib/db'
import { resizeImage } from '../../lib/image'
import { type Category, type Product } from '../../lib/types'

export function ProductoForm({ product, categories, onClose, onSaved }: { product: Product | null; categories: Category[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [codigo, setCodigo] = useState(product?.codigo ?? '')
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
    if (!codigo.trim()) return setError('Escribe el código del producto: es su clave y no puede repetirse')
    if (!name.trim()) return setError('Escribe el nombre del producto')
    if (!Number.isFinite(value) || value < 0) return setError('El precio no es válido')
    setBusy(true)
    try {
      await db.saveProduct({
        id: product?.id,
        codigo: codigo.trim(),
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
            <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border-2 border-line px-4 text-sm font-semibold hover:border-ink focus-within:outline-3 focus-within:outline-accion">
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
        <div className="grid grid-cols-3 gap-3">
          <Field label="Código"><Input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={20} inputMode="numeric" required /></Field>
          <div className="col-span-2"><Field label="Nombre"><Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field></div>
        </div>
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
