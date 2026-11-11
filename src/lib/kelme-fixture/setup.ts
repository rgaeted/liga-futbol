import { normalizeTeamName, type FixtureTeamDef } from './definition'

export type ExistingTeam = { id: string; name: string; categoryId: string | null; createdAt: Date }

/**
 * Busca entre los equipos ya creados el que corresponde a la definición del torneo.
 * La identidad incluye la categoría: «Unión Española» de 2019–2018 y de 2017–2016 son equipos
 * distintos, así que nunca se reutiliza un equipo de otra categoría.
 */
export function pickExistingTeam(
  candidates: ExistingTeam[],
  def: Pick<FixtureTeamDef, 'name' | 'aliases'>,
  categoryId: string,
): { team: ExistingTeam | null; duplicates: ExistingTeam[] } {
  const wanted = new Set([def.name, ...def.aliases].map(normalizeTeamName))
  const matches = candidates
    .filter((team) => team.categoryId === categoryId && wanted.has(normalizeTeamName(team.name)))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  return { team: matches[0] ?? null, duplicates: matches.slice(1) }
}
