import { MAX_PLAYER_PHOTO_BYTES, validateImageUpload } from '@/lib/image-upload'

export function validateFriendlyPlayerPhoto(
  buffer: Buffer,
  mimeType: string
): { ok: true } | { ok: false; error: string } {
  return validateImageUpload(buffer, mimeType, MAX_PLAYER_PHOTO_BYTES)
}

export function friendlyPlayerPhotoUrl(id: string, cacheKey?: string | number): string {
  const base = `/api/players/${id}/photo`
  if (cacheKey == null) return base
  return `${base}?v=${encodeURIComponent(String(cacheKey))}`
}

export function friendlyPlayerHasPhoto(player: {
  photoMimeType: string | null
  photoData: Uint8Array | Buffer | null
}): boolean {
  return Boolean(player.photoMimeType && player.photoData && player.photoData.byteLength > 0)
}

export function personHasPhoto(person: {
  photoMimeType: string | null
  photoData: Uint8Array | Buffer | null
}): boolean {
  return Boolean(person.photoMimeType && person.photoData && person.photoData.byteLength > 0)
}
