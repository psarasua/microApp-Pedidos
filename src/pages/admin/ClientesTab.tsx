import { useCallback, useEffect, useState } from 'react'
import { confirmar } from '../../components/confirmar'
import { Button, Empty, Spinner } from '../../components/ui'
import { db } from '../../lib/db'
import { nombreMostrado } from '../../lib/format'
import { type Perfil } from '../../lib/types'
import { DatosClienteModal } from './DatosClienteModal'
import { RestablecerClaveModal } from './RestablecerClaveModal'

const estadoStyle: Record<Perfil['estado'], string> = {
  pendiente: 'bg-mark text-ink',
  aprobado: 'bg-ink text-white',
  bloqueado: 'bg-stamp text-white',
}

export function ClientesTab() {
  const [clients, setClients] = useState<Perfil[] | null>(null)
  const [resetting, setResetting] = useState<Perfil | null>(null)
  const [datos, setDatos] = useState<Perfil | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const list = await db.listClientes()
      const order = { pendiente: 0, aprobado: 1, bloqueado: 2 }
      setClients(list.sort((a, b) => order[a.estado] - order[b.estado] || nombreMostrado(a).localeCompare(nombreMostrado(b), 'es')))
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
            <li key={c.id} className="rounded-2xl border border-line bg-sheet p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{nombreMostrado(c)}</p>
                  <p className="text-sm text-ink-soft">
                    Usuario <span className="rounded bg-mark px-1.5 font-bold tracking-wider text-ink">{c.usuario}</span>
                    {c.telefono && ` · Cel. ${c.telefono}`}
                  </p>
                  <p className="truncate text-sm text-ink-soft">
                    {c.email ?? 'Sin correo'}
                    {c.email && !c.email_verificado && <span className="font-semibold text-stamp"> · correo sin verificar</span>}
                  </p>
                  {c.direccion && <p className="truncate text-sm text-ink-soft">{c.direccion}</p>}
                  {c.rol === 'admin' && !c.codigo_cliente ? (
                    <p className="mt-1 text-sm text-ink-soft">Para hacer pedidos desde esta cuenta asígnale un código y nombre de cliente.</p>
                  ) : c.codigo_cliente && c.nombre_cliente ? (
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">Cliente {c.codigo_cliente}</span> · {c.nombre_cliente}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-stamp">Sin código de cliente: no puede hacer pedidos</p>
                  )}
                  {c.debe_cambiar_clave && <p className="text-sm font-semibold text-stamp">Tiene una contraseña temporal sin cambiar</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${c.rol === 'admin' ? 'bg-ink text-white' : estadoStyle[c.estado]}`}>
                  {c.rol === 'admin' ? 'administrador' : c.estado}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.rol !== 'admin' && c.estado !== 'aprobado' && c.email_verificado && <Button onClick={() => setEstado(c, 'aprobado')} className="h-10 text-sm">Aprobar</Button>}
                {c.rol !== 'admin' && c.estado !== 'aprobado' && !c.email_verificado && <p className="self-center text-sm text-ink-soft">Se puede aprobar cuando verifique su correo.</p>}
                {c.rol !== 'admin' && c.estado === 'aprobado' && (
                  <Button variant="danger" onClick={async () => (await confirmar(`¿Bloquear a ${nombreMostrado(c)}?`, 'Bloquear')) && setEstado(c, 'bloqueado')}>Bloquear</Button>
                )}
                <Button variant="ghost" onClick={() => setDatos(c)}>{c.codigo_cliente ? 'Editar código y nombre' : 'Asignar código y nombre'}</Button>
                {/* La contraseña de un administrador no se restablece desde acá: la función del servidor tampoco lo permite. */}
                {c.rol !== 'admin' && <Button variant="ghost" onClick={() => setResetting(c)}>Restablecer contraseña</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {resetting && <RestablecerClaveModal client={resetting} onClose={() => setResetting(null)} />}
      {datos && (
        <DatosClienteModal
          client={datos}
          onClose={() => setDatos(null)}
          onSaved={async () => {
            await load()
          }}
        />
      )}
    </>
  )
}
