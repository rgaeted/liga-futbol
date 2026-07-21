import { hasStoredImage } from '@/lib/image-upload'

export function teamCrestUrl(teamId: string): string {
  return `/api/teams/${teamId}/crest`
}

export function teamHasCrest(team: {
  crestMimeType: string | null
  crestData: Uint8Array | Buffer | null
}): boolean {
  return hasStoredImage(team.crestMimeType, team.crestData)
}
