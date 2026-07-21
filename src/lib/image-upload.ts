export const MAX_IMAGE_BYTES = 500 * 1024
export const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateImageUpload(
  buffer: Buffer,
  mimeType: string
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: 'Formato no permitido. Usa JPG, PNG o WebP.' }
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'La imagen no puede superar 500 KB.' }
  }
  if (buffer.byteLength === 0) {
    return { ok: false, error: 'Archivo vacío.' }
  }
  return { ok: true }
}

export function hasStoredImage(
  mimeType: string | null | undefined,
  data: Uint8Array | Buffer | null | undefined
): boolean {
  return Boolean(mimeType && data && data.byteLength > 0)
}
