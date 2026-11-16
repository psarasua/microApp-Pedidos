type Props = { value: number; onChange: (n: number) => void; label: string; size?: 'md' | 'lg' }

/** Campo de cantidad: se escribe el número o se suma y resta con los botones. Con 0 el artículo no entra al pedido. */
export function Stepper({ value, onChange, label, size = 'md' }: Props) {
  const btn = `grid place-items-center font-bold leading-none select-none active:scale-95 transition-transform disabled:opacity-30 disabled:active:scale-100 ${
    size === 'lg' ? 'h-12 w-12 text-2xl' : 'h-10 w-10 text-xl'
  }`
  return (
    <div
      className={`inline-flex shrink-0 items-stretch overflow-hidden rounded-lg border-2 ${value > 0 ? 'border-ink' : 'border-line'} bg-sheet`}
      role="group"
      aria-label={label}
    >
      <button type="button" className={`${btn} hover:bg-paper`} onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label={`Quitar uno de ${label}`}>
        −
      </button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={`Cantidad de ${label}`}
        className={`w-12 text-center font-bold outline-none ${value > 0 ? 'bg-mark' : 'bg-paper text-ink-soft'} ${size === 'lg' ? 'text-lg' : 'text-base'}`}
        value={value}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className={`${btn} hover:bg-paper`} onClick={() => onChange(value + 1)} aria-label={`Agregar uno de ${label}`}>
        +
      </button>
    </div>
  )
}
