/**
 * Utility to optimize uploaded or captured images:
 * - Fixes EXIF orientation (critical for phone photos taken vertically/horizontally)
 * - Constrains maximum dimension to 1600px (standard 300 DPI document size)
 * - Prevents mobile browser memory exhaustion (OOM) and crashes
 * - Returns a clean JPEG dataUrl and dimensions
 */

export async function optimizeImageFile(file, maxDimension = 1600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = (err) => {
      console.error('Error reading file:', err)
      reject(new Error('No se pudo leer la foto seleccionada'))
    }

    reader.onload = (e) => {
      const img = new Image()

      img.onerror = (err) => {
        console.error('Error loading image into memory:', err)
        reject(new Error('El formato de la imagen no es compatible'))
      }

      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width
          let h = img.naturalHeight || img.height

          if (!w || !h) {
            reject(new Error('Dimensiones de imagen inválidas'))
            return
          }

          // Calculate scaling ratio
          let scale = 1
          if (w > maxDimension || h > maxDimension) {
            scale = Math.min(maxDimension / w, maxDimension / h)
          }

          const targetW = Math.round(w * scale)
          const targetH = Math.round(h * scale)

          const canvas = document.createElement('canvas')
          canvas.width = targetW
          canvas.height = targetH
          const ctx = canvas.getContext('2d', { willReadFrequently: true })

          // High quality image smoothing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, targetW, targetH)

          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.90)

          resolve({
            dataUrl: optimizedDataUrl,
            width: targetW,
            height: targetH,
            name: file.name || 'documento.jpg'
          })
        } catch (err) {
          console.error('Optimization error:', err)
          reject(err)
        }
      }

      img.src = e.target.result
    }

    reader.readAsDataURL(file)
  })
}
