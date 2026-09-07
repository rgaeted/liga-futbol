export const MAX_IMAGE_BYTES = 500 * 1024
export const MAX_PLAYER_PHOTO_BYTES = 2 * 1024 * 1024
export const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function formatMaxImageSize(maxBytes: number): string {
  if (maxBytes >= 1024 * 1024 && maxBytes % (1024 * 1024) === 0) {
    return `${maxBytes / (1024 * 1024)} MB`
  }
  return `${Math.round(maxBytes / 1024)} KB`
}

export function validateImageUpload(
  buffer: Buffer,
  mimeType: string,
  maxBytes: number = MAX_IMAGE_BYTES
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: 'Formato no permitido. Usa JPG, PNG o WebP.' }
  }
  if (buffer.byteLength > maxBytes) {
    return { ok: false, error: `La imagen no puede superar ${formatMaxImageSize(maxBytes)}.` }
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
