import { validateImageUpload } from '@/lib/image-upload'

export function validateFriendlyPlayerPhoto(
  buffer: Buffer,
  mimeType: string
): { ok: true } | { ok: false; error: string } {
  return validateImageUpload(buffer, mimeType)
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
