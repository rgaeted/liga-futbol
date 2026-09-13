export const CARD_PHOTO_WIDTH = 720
export const CARD_PHOTO_HEIGHT = 900
export const MAX_CARD_PHOTO_BYTES = 2 * 1024 * 1024

export function personHasCardPhoto(person: {
  cardPhotoMimeType: string | null
  cardPhotoData: Uint8Array | Buffer | null
}): boolean {
  return Boolean(
    person.cardPhotoMimeType === 'image/png' &&
      person.cardPhotoData &&
      person.cardPhotoData.byteLength > 0,
  )
}

export function playerCardPhotoUrl(
  playerId: string,
  cacheKey?: string | number | Date | null,
): string {
  const base = `/api/players/${playerId}/card-photo`
  if (cacheKey == null) return base

  const value = cacheKey instanceof Date ? cacheKey.getTime() : cacheKey
  return `${base}?v=${encodeURIComponent(String(value))}`
}
