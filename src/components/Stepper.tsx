type Props = { value: number; onChange: (n: number) => void; label: string; size?: 'md' | 'lg' }

/** Selector de cantidad: botones grandes para usar con un dedo. */
export function Stepper({ value, onChange, label, size = 'md' }: Props) {
  const btn = `grid place-items-center font-bold leading-none select-none active:scale-95 transition-transform ${
    size === 'lg' ? 'h-12 w-12 text-2xl' : 'h-10 w-10 text-xl'
  }`
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-lg border-2 border-ink bg-sheet" role="group" aria-label={label}>
      <button type="button" className={`${btn} hover:bg-paper`} onClick={() => onChange(value - 1)} aria-label={`Quitar uno de ${label}`}>
        −
      </button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={`Cantidad de ${label}`}
        className={`w-12 bg-mark text-center font-bold outline-none ${size === 'lg' ? 'text-lg' : 'text-base'}`}
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
