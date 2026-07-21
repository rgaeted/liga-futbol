import { hasStoredImage } from '@/lib/image-upload'

export type MatchSide = 'A' | 'B'

export function matchSideCrestUrl(matchId: string, side: MatchSide): string {
  return `/api/matches/${matchId}/crest/${side}`
}

export function matchSideHasCrest(
  match: {
    sideACrestMimeType: string | null
    sideACrestData: Uint8Array | Buffer | null
    sideBCrestMimeType: string | null
    sideBCrestData: Uint8Array | Buffer | null
  },
  side: MatchSide
): boolean {
  if (side === 'A') {
    return hasStoredImage(match.sideACrestMimeType, match.sideACrestData)
  }
  return hasStoredImage(match.sideBCrestMimeType, match.sideBCrestData)
}
