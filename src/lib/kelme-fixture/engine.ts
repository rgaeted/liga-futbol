import {
  deriveFinalPositions,
  planDefinitions,
  type DefinitionPlan,
  type DefinitionState,
  type FinalPosition,
} from './definitions'
import { calculateStandings, type StandingsResult } from './standings'
import {
  DEFAULT_FIXTURE_CONFIG,
  GROUPS_CATEGORY,
  LEAGUE_CATEGORY,
  isDefinitionPhase,
  tableKey,
  type CategoryCode,
  type FixtureConfig,
  type FixtureMatch,
  type GroupCode,
} from './types'

export type FixtureTeam = {
  id: string
  name: string
  category: CategoryCode
  group: GroupCode | null
  sortOrder: number
}

export type FixtureState = {
  standings: { A: StandingsResult; B: StandingsResult; league: StandingsResult }
  plan: DefinitionPlan
  positions: FinalPosition[]
}

function teamIdsFor(teams: FixtureTeam[], category: CategoryCode, group: GroupCode | null): string[] {
  return teams
    .filter((team) => team.category === category && (group == null || team.group === group))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((team) => team.id)
}

/**
 * Cálculo determinista del torneo a partir de equipos, partidos guardados y configuración.
 * No modifica nada: devuelve tablas, plan de cruces y posiciones finales.
 */
export function recalculateFixture(input: {
  teams: FixtureTeam[]
  matches: FixtureMatch[]
  config?: FixtureConfig
}): FixtureState {
  const config = input.config ?? DEFAULT_FIXTURE_CONFIG
  const { teams, matches } = input

  const standingsFor = (category: CategoryCode, group: GroupCode | null) =>
    calculateStandings({
      teamIds: teamIdsFor(teams, category, group),
      matches: matches.filter(
        (m) =>
          m.category === category &&
          (group == null ? m.phase === 'LEAGUE' : m.phase === 'GROUP' && m.group === group),
      ),
      manualOrder: config.manualRanking[tableKey(category, group)]?.teamIds ?? null,
    })

  const A = standingsFor(GROUPS_CATEGORY, 'A')
  const B = standingsFor(GROUPS_CATEGORY, 'B')
  const league = standingsFor(LEAGUE_CATEGORY, null)

  const definitions = matches.filter(
    (m): m is FixtureMatch & { homeSlot: NonNullable<FixtureMatch['homeSlot']>; awaySlot: NonNullable<FixtureMatch['awaySlot']> } =>
      isDefinitionPhase(m.phase) && m.homeSlot != null && m.awaySlot != null,
  )
  const states: DefinitionState[] = definitions.map((m) => ({
    code: m.code,
    phase: m.phase,
    status: m.status,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeSlot: m.homeSlot,
    awaySlot: m.awaySlot,
  }))

  const plan = planDefinitions({ standingsA: A, standingsB: B, definitions: states })
  const positions = deriveFinalPositions(
    definitions.map((m) => ({
      phase: m.phase,
      status: m.status,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      penaltyHome: m.penaltyHome,
      penaltyAway: m.penaltyAway,
    })),
    config.definitionDrawPolicy,
  )

  return { standings: { A, B, league }, plan, positions }
}
