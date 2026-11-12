import { hasStoredImage } from '@/lib/image-upload'

/**
 * URL del escudo. `version` (normalmente `team.updatedAt`) cambia cuando se sube un escudo nuevo,
 * así el navegador no sigue mostrando la copia anterior.
 */
export function teamCrestUrl(teamId: string, version?: Date | number | null): string {
  const base = `/api/teams/${teamId}/crest`
  if (version == null) return base
  const stamp = version instanceof Date ? version.getTime() : version
  return `${base}?v=${stamp}`
}

export function teamHasCrest(team: {
  crestMimeType: string | null
  crestData: Uint8Array | Buffer | null
}): boolean {
  return hasStoredImage(team.crestMimeType, team.crestData)
}
