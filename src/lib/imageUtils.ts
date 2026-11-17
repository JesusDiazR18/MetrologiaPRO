/**
 * Utilidad para comprimir y optimizar imágenes en el cliente antes de enviarlas al servidor.
 * Evita el error 413 Payload Too Large (límite de 4.5 MB en Vercel Serverless) y fallos de red.
 */
export function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
      return
    }

    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = reject

    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        } else {
          width = Math.round((width * maxWidth) / height)
          height = maxWidth
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(reader.result as string)
        return
      }

      // Fondo blanco por si la imagen original tenía transparencias PNG
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      // Comprimir a JPEG con calidad 0.8 (~150KB - 350KB)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(compressedDataUrl)
    }

    img.onerror = () => {
      const fallbackReader = new FileReader()
      fallbackReader.onload = () => resolve(fallbackReader.result as string)
      fallbackReader.onerror = reject
      fallbackReader.readAsDataURL(file)
    }

    reader.readAsDataURL(file)
  })
}
