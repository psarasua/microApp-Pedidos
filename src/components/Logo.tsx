import { useId } from 'react'

/**
 * Identidad de la app: una gota de leche con un tilde (pedido listo).
 * La gota es la marca; en el nombre reemplaza el punto de la «i»; al cargar se llena de leche y marca el tilde.
 */
const GOTA = 'M16 5c3.9 4.9 7.5 8.6 7.5 12.9a7.5 7.5 0 0 1-15 0C8.5 13.6 12.1 9.9 16 5z'
const TILDE = 'm12.3 18.4 2.7 2.7 5.2-5.6'

/** Marca cuadrada (ícono de la app). */
function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--color-accion)" />
      <path d={GOTA} fill="#fbfaf6" />
      <path d={TILDE} fill="none" stroke="var(--color-accion)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Marca con el nombre; el punto de la «i» es la gota. */
export function Logo({ className = '', tamano = 'text-xl' }: { className?: string; tamano?: string }) {
  return (
    <span className={`font-display inline-flex items-center gap-2 font-extrabold leading-none ${tamano} ${className}`}>
      <LogoMark className="h-[1.45em] w-[1.45em]" />
      <span aria-label="Pedidos" className="inline-flex items-baseline">
        <span aria-hidden="true">ped</span>
        <span aria-hidden="true" className="relative inline-block">
          ı
          <svg viewBox="0 0 32 32" className="absolute left-1/2 top-[-0.16em] h-[0.6em] w-[0.6em] -translate-x-1/2">
            <path d={GOTA} fill="var(--color-accion)" />
          </svg>
        </span>
        <span aria-hidden="true">dos</span>
      </span>
    </span>
  )
}

/** Cargando: la gota se llena de leche, dibuja el tilde y vuelve a empezar. Con «reducir movimiento» queda quieta y llena. */
export function LogoCargando({ className = 'h-20 w-20' }: { className?: string }) {
  const id = `gota-${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 32 32" className={`logo-carga ${className}`} role="img" aria-label="Cargando">
      <defs>
        <clipPath id={id}>
          <path d={GOTA} />
        </clipPath>
      </defs>
      <path d={GOTA} fill="var(--color-accion-soft)" />
      <g clipPath={`url(#${id})`}>
        <g className="leche">
          <g className="olas">
            <path d="M-16 0q4-3 8 0t8 0 8 0 8 0 8 0 8 0 8 0 8 0V40H-16z" fill="var(--color-accion)" />
          </g>
        </g>
      </g>
      <path d={GOTA} fill="none" stroke="var(--color-accion)" strokeWidth="1.4" strokeLinejoin="round" />
      <path className="tilde" d={TILDE} fill="none" stroke="#fbfaf6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
    </svg>
  )
}
