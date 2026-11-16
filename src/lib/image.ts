/** Reduce la foto a un máximo de 800 px y la comprime (las fotos de celular pesan varios MB). */
export async function resizeImage(file: File, max = 800, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen')
  if (file.size > 25 * 1024 * 1024) throw new Error('La imagen es demasiado grande (máximo 25 MB)')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', quality),
  )
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}
