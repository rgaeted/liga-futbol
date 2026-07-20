const MAX_PHOTO_BYTES = 500 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateFriendlyPlayerPhoto(
  buffer: Buffer,
  mimeType: string
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: 'Formato no permitido. Usa JPG, PNG o WebP.' }
  }
  if (buffer.byteLength > MAX_PHOTO_BYTES) {
    return { ok: false, error: 'La foto no puede superar 500 KB.' }
  }
  if (buffer.byteLength === 0) {
    return { ok: false, error: 'Archivo vacío.' }
  }
  return { ok: true }
}

export function friendlyPlayerPhotoUrl(id: string): string {
  return `/api/friendly-players/${id}/photo`
}

export function friendlyPlayerHasPhoto(player: {
  photoMimeType: string | null
  photoData: Uint8Array | Buffer | null
}): boolean {
  return Boolean(player.photoMimeType && player.photoData && player.photoData.byteLength > 0)
}
