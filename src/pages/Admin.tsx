import { useState } from 'react'
import { Spinner } from '../components/ui'
import { useData } from '../lib/data'
import { db } from '../lib/db'
import { CategoriasTab } from './admin/CategoriasTab'
import { ClientesTab } from './admin/ClientesTab'
import { HerramientasDatosTab } from './admin/HerramientasDatosTab'
import { ProductosTab } from './admin/ProductosTab'

type Tab = 'productos' | 'categorias' | 'clientes' | 'datos'

/** Pantalla de administración: solo reparte entre las pestañas; cada una vive en `pages/admin/`. */
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
      {loading ? <Spinner /> : tab === 'productos' ? <ProductosTab /> : tab === 'categorias' ? <CategoriasTab /> : tab === 'clientes' ? <ClientesTab /> : <HerramientasDatosTab />}
    </div>
  )
}
