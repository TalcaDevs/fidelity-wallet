export interface CompressOptions {
  /** Lado mayor máximo, en píxeles. */
  maxSide?: number;
  /** Calidad JPEG de 0 a 1. */
  quality?: number;
  /** Por debajo de este tamaño se envía tal cual. */
  minBytes?: number;
}

/**
 * Achica una foto antes de subirla: la cámara de un teléfono saca de 3 a 15 MB y en caja la red
 * suele ser 4G. Ante cualquier problema (navegador sin createImageBitmap, imagen ilegible) se
 * devuelve el archivo original: el backend igual valida y recodifica.
 */
export async function compressImage(
  file: File,
  { maxSide = 1600, quality = 0.8, minBytes = 500_000 }: CompressOptions = {},
): Promise<File> {
  if (file.size <= minBytes || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'foto'}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
