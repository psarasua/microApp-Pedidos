const currency = import.meta.env.VITE_CURRENCY || 'UYU'

const money = new Intl.NumberFormat('es-UY', { style: 'currency', currency, maximumFractionDigits: 2 })

export const formatMoney = (n: number) => money.format(n)

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' })
