import type { StandingsResult } from './standings'
import type {
  DefinitionDrawPolicy,
  FixturePhase,
  FixtureSlot,
  FixtureStatus,
} from './types'

export type DefinitionState = {
  code: string
  phase: FixturePhase
  status: FixtureStatus
  homeTeamId: string | null
  awayTeamId: string | null
  homeSlot: FixtureSlot
  awaySlot: FixtureSlot
}

export type DefinitionAssignment = {
  code: string
  homeTeamId: string | null
  awayTeamId: string | null
}

export type DefinitionPlan = {
  /** Ambos grupos tienen clasificación definitiva (completos y sin empates pendientes). */
  ready: boolean
  pendingTie: { A: boolean; B: boolean }
  /** Alguna definición ya comenzó: no se reemplazan participantes automáticamente. */
  locked: boolean
  /** Cambios a aplicar sobre los partidos existentes (nunca crea partidos nuevos). */
  assignments: DefinitionAssignment[]
  conflict: { codes: string[]; message: string } | null
}

function teamForSlot(
  slot: FixtureSlot,
  standings: { A: StandingsResult; B: StandingsResult },
): string | null {
  return standings[slot.group].rows[slot.rank - 1]?.teamId ?? null
}

export function planDefinitions(input: {
  standingsA: StandingsResult
  standingsB: StandingsResult
  definitions: DefinitionState[]
}): DefinitionPlan {
  const { standingsA, standingsB, definitions } = input
  const ready = standingsA.definitive && standingsB.definitive
  const standings = { A: standingsA, B: standingsB }

  const targets = definitions.map((def) => ({
    def,
    homeTeamId: ready ? teamForSlot(def.homeSlot, standings) : null,
    awayTeamId: ready ? teamForSlot(def.awaySlot, standings) : null,
  }))
  const changed = targets.filter(
    (t) => t.def.homeTeamId !== t.homeTeamId || t.def.awayTeamId !== t.awayTeamId,
  )

  const locked = definitions.some((def) => def.status === 'IN_PROGRESS' || def.status === 'FINAL')
  const pendingTie = {
    A: standingsA.complete && !standingsA.fullyResolved,
    B: standingsB.complete && !standingsB.fullyResolved,
  }

  if (locked) {
    const conflicting = changed.map((t) => t.def.code)
    return {
      ready,
      pendingTie,
      locked,
      assignments: [],
      conflict:
        conflicting.length > 0
          ? {
              codes: conflicting,
              message:
                'La clasificación de los grupos cambió después de comenzar las definiciones. ' +
                'Los cruces no se reasignaron automáticamente: revisa el cuadro y corrígelo de forma explícita.',
            }
          : null,
    }
  }

  return {
    ready,
    pendingTie,
    locked,
    assignments: changed.map((t) => ({
      code: t.def.code,
      homeTeamId: t.homeTeamId,
      awayTeamId: t.awayTeamId,
    })),
    conflict: null,
  }
}

export type DefinitionResult = {
  phase: FixturePhase
  status: FixtureStatus
  homeTeamId: string | null
  awayTeamId: string | null
  homeGoals: number
  awayGoals: number
  penaltyHome: number | null
  penaltyAway: number | null
}

export type FinalPosition = { position: number; teamId: string; tied: boolean }

const BASE_POSITION: Partial<Record<FixturePhase, number>> = {
  FINAL: 1,
  THIRD_PLACE: 3,
  FIFTH_PLACE: 5,
}

/** Posiciones 1.º a 6.º derivadas de M13/M14/M15 finalizados. */
export function deriveFinalPositions(
  results: DefinitionResult[],
  policy: DefinitionDrawPolicy,
): FinalPosition[] {
  const positions: FinalPosition[] = []

  for (const result of results) {
    const base = BASE_POSITION[result.phase]
    if (base == null || result.status !== 'FINAL') continue
    if (!result.homeTeamId || !result.awayTeamId) continue

    let winner: string | null = null
    let loser: string | null = null
    if (result.homeGoals !== result.awayGoals) {
      const homeWon = result.homeGoals > result.awayGoals
      winner = homeWon ? result.homeTeamId : result.awayTeamId
      loser = homeWon ? result.awayTeamId : result.homeTeamId
    } else if (
      result.penaltyHome != null &&
      result.penaltyAway != null &&
      result.penaltyHome !== result.penaltyAway
    ) {
      const homeWon = result.penaltyHome > result.penaltyAway
      winner = homeWon ? result.homeTeamId : result.awayTeamId
      loser = homeWon ? result.awayTeamId : result.homeTeamId
    }

    if (winner && loser) {
      positions.push({ position: base, teamId: winner, tied: false })
      positions.push({ position: base + 1, teamId: loser, tied: false })
    } else if (policy === 'DRAW_ALLOWED') {
      positions.push({ position: base, teamId: result.homeTeamId, tied: true })
      positions.push({ position: base, teamId: result.awayTeamId, tied: true })
    }
    // Con empate sin método aprobado no se asigna posición: queda pendiente.
  }

  return positions.sort((a, b) => a.position - b.position)
}
