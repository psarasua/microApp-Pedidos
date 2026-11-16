import { useEffect, useRef, type ReactNode } from 'react'

type Props = { title: string; onClose: () => void; children: ReactNode }

/** Diálogo modal con el elemento nativo <dialog>: el navegador se ocupa del foco, Esc y el fondo inerte. */
export function Modal({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      closedby="any"
      onClose={onClose}
      className="modal m-0 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-sheet p-5 text-ink sm:m-auto sm:rounded-2xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id="modal-title" className="text-xl font-bold">{title}</h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="grid h-10 w-10 place-items-center rounded-lg text-2xl hover:bg-paper"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  )
}
