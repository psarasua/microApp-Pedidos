const currency = import.meta.env.VITE_CURRENCY || 'UYU'

const money = new Intl.NumberFormat('es-UY', { style: 'currency', currency, maximumFractionDigits: 2 })

export const formatMoney = (n: number) => money.format(n)

/** Los productos importados del catálogo no traen precio: se muestran como "Sin precio" hasta que se carguen. */
export const formatPrice = (n: number) => (n > 0 ? money.format(n) : 'Sin precio')

/** Minúsculas y sin tildes, para que "yogur" encuentre "Yogur" y "limon" encuentre "Limón". */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Nombre con que se muestra una cuenta: el que asignó el admin y, mientras no lo haya, el provisorio («Cliente 496230» o el que escribió al registrarse). */
export const nombreMostrado = (p: { nombre: string; nombre_cliente?: string | null }) => p.nombre_cliente?.trim() || p.nombre

export const formatDate =(iso: string) =>
  new Date(iso).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' })
