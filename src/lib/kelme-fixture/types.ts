export type CategoryCode = '2019-2018' | '2017-2016'

/** Categoría de 6 equipos: dos grupos de tres y partidos de definición (final, 3.º y 5.º puesto). */
export const GROUPS_CATEGORY: CategoryCode = '2017-2016'
/** Categoría de 4 equipos: liga todos contra todos a una vuelta. */
export const LEAGUE_CATEGORY: CategoryCode = '2019-2018'

export type FixturePhase = 'GROUP' | 'LEAGUE' | 'FINAL' | 'THIRD_PLACE' | 'FIFTH_PLACE'

/** Estado del partido en términos del reglamento. Se mapea a `MatchStatus` de Prisma. */
export type FixtureStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' | 'CANCELLED'

export type GroupCode = 'A' | 'B'

export type DecidedBy = 'REGULAR_TIME' | 'PENALTIES' | 'ADMINISTRATIVE'

export type DefinitionCode = 'M13' | 'M14' | 'M15'

export type FixtureSlot = { group: GroupCode; rank: 1 | 2 | 3 }

export const DEFINITION_PHASES: readonly FixturePhase[] = ['FINAL', 'THIRD_PLACE', 'FIFTH_PLACE']

export function isDefinitionPhase(phase: FixturePhase | null | undefined): boolean {
  return phase != null && DEFINITION_PHASES.includes(phase)
}

/** Política para empates en los partidos de definición. Debe aprobarla la organización. */
export type DefinitionDrawPolicy = 'PENALTIES_REQUIRED' | 'DRAW_ALLOWED'

export type FixtureConfig = {
  definitionDrawPolicy: DefinitionDrawPolicy
  /** Orden manual aprobado para romper empates irresolubles, por clave de tabla (A, B, LEAGUE). */
  manualRanking: Record<string, { teamIds: string[]; reason: string } | undefined>
}

export const DEFAULT_FIXTURE_CONFIG: FixtureConfig = {
  definitionDrawPolicy: 'PENALTIES_REQUIRED',
  manualRanking: {},
}

export type FixtureMatch = {
  id: string
  code: string
  category: CategoryCode
  phase: FixturePhase
  group: GroupCode | null
  court: number
  startAt: Date
  endAt: Date
  homeTeamId: string | null
  awayTeamId: string | null
  homeSlot: FixtureSlot | null
  awaySlot: FixtureSlot | null
  homeGoals: number
  awayGoals: number
  status: FixtureStatus
  decidedBy: DecidedBy | null
  penaltyHome: number | null
  penaltyAway: number | null
}

export type TableKey = 'A' | 'B' | 'LEAGUE'

export function tableKey(category: CategoryCode, group: GroupCode | null): TableKey {
  return category === GROUPS_CATEGORY ? (group ?? 'A') : 'LEAGUE'
}
