import { useState } from 'react'

const KEY = 'pedidos.install-tip'

const instalada = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

/** Aviso para instalar la app en el celular; se oculta al cerrarlo o si ya está instalada. */
export function InstallTip() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1' || instalada()
    } catch {
      return instalada()
    }
  })
  if (hidden) return null

  function close() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* sin almacenamiento: el aviso reaparece la próxima vez */
    }
    setHidden(true)
  }

  return (
    <details className="group mb-3 rounded-xl border-2 border-line bg-sheet text-sm md:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 font-semibold">
        <span>Instala la app en tu celular</span>
        <span className="text-accion group-open:hidden">Cómo</span>
      </summary>
      <div className="border-t-2 border-dashed border-line px-3 py-2 text-ink-soft">
        <p><span className="font-semibold text-ink">Android (Chrome):</span> menú ⋮ y «Instalar app».</p>
        <p className="mt-1"><span className="font-semibold text-ink">iPhone (Safari):</span> Compartir y «Añadir a pantalla de inicio».</p>
      </div>
      <div className="px-3 pb-2">
        <button onClick={close} className="h-10 rounded-lg font-semibold text-accion underline">No mostrar más</button>
      </div>
    </details>
  )
}
