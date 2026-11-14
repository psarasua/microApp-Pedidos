const currency = import.meta.env.VITE_CURRENCY || 'UYU'

const money = new Intl.NumberFormat('es-UY', { style: 'currency', currency, maximumFractionDigits: 2 })

export const formatMoney = (n: number) => money.format(n)

/** Los productos importados del catálogo no traen precio: se muestran como "Sin precio" hasta que se carguen. */
export const formatPrice = (n: number) => (n > 0 ? money.format(n) : 'Sin precio')

/** Minúsculas y sin tildes, para que "yogur" encuentre "Yogur" y "limon" encuentre "Limón". */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' })
