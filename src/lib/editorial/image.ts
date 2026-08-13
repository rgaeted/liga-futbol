export const MAX_EDITORIAL_IMAGE_BYTES = 2 * 1024 * 1024
export const ALLOWED_EDITORIAL_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateEditorialImage(
  buffer: Buffer,
  mimeType: string,
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_EDITORIAL_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: 'Formato no permitido. Usa JPG, PNG o WebP.' }
  }
  if (buffer.byteLength === 0) {
    return { ok: false, error: 'Archivo vacío.' }
  }
  if (buffer.byteLength > MAX_EDITORIAL_IMAGE_BYTES) {
    return { ok: false, error: 'La imagen no puede superar 2 MiB.' }
  }
  return { ok: true }
}

export function editorialImageExtension(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  return 'bin'
}
