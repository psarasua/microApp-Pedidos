import { useState } from 'react'
import { Button } from './ui'

type Props = {
  usuario?: string
  codigo: string
  /** Avisa si la persona marcó que ya guardó los datos; sirve para habilitar el botón de continuar. */
  onAckChange: (ack: boolean) => void
}

/** Muestra el usuario y el código de recuperación una sola vez, y pide confirmar que se guardaron. */
export function CredentialCard({ usuario, codigo, onAckChange }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const text = [usuario && `Usuario: ${usuario}`, `Código de recuperación: ${codigo}`].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      /* sin portapapeles: la persona puede anotarlo a mano o sacar una captura */
    }
  }

  return (
    <div className="rounded-2xl border-2 border-line bg-sheet p-5">
      {usuario && (
        <div className="mb-4 text-center">
          <p className="text-sm font-semibold text-ink-soft">Tu usuario</p>
          <p className="mt-1 inline-block bg-mark px-3 text-4xl font-extrabold tracking-widest" aria-label={`Usuario ${usuario.split('').join(' ')}`}>
            {usuario}
          </p>
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-semibold text-ink-soft">Tu código de recuperación</p>
        <p className="mt-1 inline-block rounded-lg border-2 border-ink px-3 py-2 font-mono text-2xl font-extrabold tracking-widest" aria-label={`Código ${codigo.split('').join(' ')}`}>
          {codigo}
        </p>
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        Si olvidas tu contraseña, entras con tu usuario y este código y eliges una nueva, sin pedirle nada a nadie.
        <span className="font-semibold text-ink"> Se muestra solo ahora.</span> Anótalo o saca una captura de pantalla.
      </p>
      <Button variant="ghost" className="mt-3 w-full" onClick={copy}>{copied ? 'Copiado' : 'Copiar'}</Button>
      <label className="mt-4 flex items-start gap-3 font-semibold">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-carbon" onChange={(e) => onAckChange(e.target.checked)} />
        Ya lo guardé en un lugar seguro
      </label>
    </div>
  )
}
