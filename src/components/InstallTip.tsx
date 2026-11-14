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
    <div className="mb-3 rounded-xl border-2 border-line bg-sheet p-3 text-sm md:hidden">
      <p className="font-bold">Instala la app para entrar más rápido</p>
      <p className="mt-1 text-ink-soft">
        <span className="font-semibold">Android (Chrome):</span> menú ⋮ y «Instalar app». <span className="font-semibold">iPhone (Safari):</span> Compartir y «Añadir a pantalla de inicio».
      </p>
      <button onClick={close} className="mt-2 h-10 rounded-lg px-3 font-semibold text-carbon underline">Entendido</button>
    </div>
  )
}
