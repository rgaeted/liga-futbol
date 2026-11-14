import { SeasonRosterStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { teamCrestUrl } from '@/lib/team-crest'

export type TeamRoster = {
  teamId: string
  name: string
  /** Nombre de la categoría de la temporada (p. ej. "2017-2016"). */
  category: string
  color: string | null
  crestUrl: string | null
  /** Jugadores activos como "Nombre I." (según cómo estén guardados). */
  players: string[]
}

export function playerDisplayName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim()
}

/**
 * Plantillas por equipo de una temporada, para la landing pública. Es tolerante a fallos:
 * si algo falla devuelve una lista vacía y la landing sigue funcionando.
 */
export async function getFixtureRosters(seasonId: string): Promise<TeamRoster[]> {
  try {
    const seasonTeams = await db.seasonTeam.findMany({
      where: { seasonId },
      include: {
        team: { select: { id: true, name: true, color: true, crestMimeType: true, updatedAt: true } },
        seasonCategory: { select: { sortOrder: true, category: { select: { name: true } } } },
        rosterEntries: {
          where: { status: SeasonRosterStatus.ACTIVE },
          include: { player: { select: { person: { select: { firstName: true, lastName: true } } } } },
        },
      },
    })
    return seasonTeams
      .filter((st) => st.seasonCategory)
      .sort(
        (a, b) =>
          a.seasonCategory!.sortOrder - b.seasonCategory!.sortOrder || a.sortOrder - b.sortOrder,
      )
      .map((st) => ({
        teamId: st.team.id,
        name: (st.team.name || st.displayName || '').trim(),
        category: st.seasonCategory!.category.name,
        color: st.color ?? st.team.color,
        crestUrl: st.team.crestMimeType ? teamCrestUrl(st.team.id, st.team.updatedAt) : null,
        players: st.rosterEntries
          .map((entry) => playerDisplayName(entry.player.person))
          .sort((a, b) => a.localeCompare(b, 'es-CL')),
      }))
  } catch (error) {
    console.warn('[kelme-fixture] no se pudieron cargar las plantillas', error)
    return []
  }
}
