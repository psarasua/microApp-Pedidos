type Props = { value: number; onChange: (n: number) => void; label: string; size?: 'md' | 'lg' }

/**
 * Campo de cantidad: se escribe el número o se suma y resta con los botones. Con 0 el artículo no entra al pedido.
 * En 0 es liviano (sin borde, «+» en verde y sin «−»); al elegir cantidad toma borde y el número resalta.
 */
export function Stepper({ value, onChange, label, size = 'md' }: Props) {
  const vacio = value <= 0
  const btn = `grid place-items-center font-bold leading-none select-none ${size === 'lg' ? 'h-12 w-12 text-2xl' : 'h-10 w-10 text-xl'}`
  return (
    <div
      className={`inline-flex shrink-0 items-stretch overflow-hidden rounded-xl border-2 transition-colors duration-150 ${
        vacio ? 'border-transparent bg-accion-soft' : 'border-accion bg-sheet'
      }`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={`${btn} hover:bg-paper ${vacio ? 'hidden' : ''}`}
        onClick={() => onChange(value - 1)}
        disabled={vacio}
        aria-label={`Quitar uno de ${label}`}
      >
        −
      </button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={`Cantidad de ${label}`}
        className={`w-12 text-center font-bold outline-none transition-colors duration-150 ${
          vacio ? 'bg-transparent text-ink-soft' : 'bg-mark'
        } ${size === 'lg' ? 'text-lg' : 'text-base'}`}
        value={value}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        className={`${btn} hover:bg-white/70 ${vacio ? 'text-accion-dark' : ''}`}
        onClick={() => onChange(value + 1)}
        aria-label={`Agregar uno de ${label}`}
      >
        +
      </button>
    </div>
  )
}
