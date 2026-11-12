/**
 * Temporada elegida en el panel: solo se acepta una que pertenezca a la organización; cualquier
 * otro id (por ejemplo de otra liga) cae a la más reciente.
 */
export function resolveSelectedSeasonId(
  seasons: Array<{ id: string }>,
  requested: string | undefined,
): string | null {
  return seasons.find((season) => season.id === requested)?.id ?? seasons[0]?.id ?? null
}
