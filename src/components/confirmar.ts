type Opcion = { valor: string; texto: string }

/**
 * Diálogo con <dialog> para elegir entre varias acciones. Devuelve el valor elegido o null si se cancela
 * (botón «Cancelar», Esc o clic fuera). La acción segura (Cancelar) recibe el foco.
 */
export function elegir(mensaje: string, opciones: Opcion[]): Promise<string | null> {
  return new Promise((resolve) => {
    const d = document.createElement('dialog')
    d.setAttribute('aria-labelledby', 'confirmar-texto')
    d.className = 'modal m-0 w-full max-w-sm rounded-t-2xl bg-sheet p-5 text-ink sm:m-auto sm:rounded-2xl'
    const p = document.createElement('p')
    p.id = 'confirmar-texto'
    p.className = 'mb-5 text-base font-semibold'
    p.textContent = mensaje
    const form = document.createElement('form')
    form.method = 'dialog'
    form.className = 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'
    const boton = (valor: string, texto: string, clases: string) => {
      const b = document.createElement('button')
      b.value = valor
      b.textContent = texto
      b.className = `min-h-12 rounded-lg px-4 font-semibold ${clases}`
      return b
    }
    const cancelar = boton('', 'Cancelar', 'bg-paper')
    cancelar.autofocus = true
    form.append(cancelar, ...opciones.map((o) => boton(o.valor, o.texto, 'bg-stamp text-white')))
    d.append(p, form)
    d.addEventListener('close', () => {
      const valor = d.returnValue
      d.remove()
      resolve(valor || null)
    })
    document.body.append(d)
    d.showModal()
  })
}

/** Reemplazo de window.confirm con <dialog>. Devuelve true si la persona confirma. */
export async function confirmar(mensaje: string, accion = 'Aceptar'): Promise<boolean> {
  return (await elegir(mensaje, [{ valor: 'si', texto: accion }])) === 'si'
}
