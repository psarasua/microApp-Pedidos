/** Reemplazo de window.confirm con <dialog>. Devuelve true si la persona confirma. */
export function confirmar(mensaje: string, accion = 'Aceptar'): Promise<boolean> {
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
    form.className = 'flex justify-end gap-2'
    const boton = (valor: string, texto: string, clases: string) => {
      const b = document.createElement('button')
      b.value = valor
      b.textContent = texto
      b.className = `h-12 rounded-lg px-4 font-semibold ${clases}`
      return b
    }
    const cancelar = boton('no', 'Cancelar', 'bg-paper')
    cancelar.autofocus = true // la acción segura recibe el foco
    form.append(cancelar, boton('si', accion, 'bg-stamp text-white'))
    d.append(p, form)
    d.addEventListener('close', () => {
      const ok = d.returnValue === 'si'
      d.remove()
      resolve(ok)
    })
    document.body.append(d)
    d.showModal()
  })
}
