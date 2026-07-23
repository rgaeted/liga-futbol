import { validateImageUpload, hasStoredImage } from '@/lib/image-upload'
import type { MatchMvpSide } from '@prisma/client'

export function validateMatchMvpPhoto(
  buffer: Buffer,
  mimeType: string
): { ok: true } | { ok: false; error: string } {
  return validateImageUpload(buffer, mimeType)
}

export function matchMvpPhotoUrl(matchId: string, side: MatchMvpSide): string {
  return `/api/matches/${matchId}/mvp/${side.toLowerCase()}/photo`
}

export function matchTeamMvpHasPhoto(row: {
  photoMimeType: string | null
  photoData: Uint8Array | Buffer | null
}): boolean {
  return hasStoredImage(row.photoMimeType, row.photoData)
}

export function parseMatchMvpSideParam(value: string): MatchMvpSide | null {
  const normalized = value.toUpperCase()
  if (normalized === 'HOME' || normalized === 'AWAY') {
    return normalized
  }
  return null
}
