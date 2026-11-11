import type { DecidedBy, DefinitionDrawPolicy, FixturePhase, FixtureStatus } from './types'
import { isDefinitionPhase } from './types'

export type ResultInput = {
  phase: FixturePhase
  status: FixtureStatus
  homeTeamId: string | null
  awayTeamId: string | null
  homeGoals: number | null | undefined
  awayGoals: number | null | undefined
  penaltyHome?: number | null
  penaltyAway?: number | null
  decidedBy?: DecidedBy | null
  /** El administrador confirmó el cierre del partido. */
  confirmFinal?: boolean
  drawPolicy: DefinitionDrawPolicy
}

export type NormalizedResult = {
  status: FixtureStatus
  homeGoals: number
  awayGoals: number
  penaltyHome: number | null
  penaltyAway: number | null
  decidedBy: DecidedBy | null
}

export type ValidationOutcome =
  | { ok: true; value: NormalizedResult }
  | { ok: false; error: string }

const MAX_GOALS = 99

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_GOALS
}

export function validateResult(input: ResultInput): ValidationOutcome {
  const definition = isDefinitionPhase(input.phase)

  if (input.status === 'CANCELLED') {
    return {
      ok: true,
      value: {
        status: 'CANCELLED',
        homeGoals: 0,
        awayGoals: 0,
        penaltyHome: null,
        penaltyAway: null,
        decidedBy: null,
      },
    }
  }

  if (input.status === 'SCHEDULED') {
    return {
      ok: true,
      value: {
        status: 'SCHEDULED',
        homeGoals: 0,
        awayGoals: 0,
        penaltyHome: null,
        penaltyAway: null,
        decidedBy: null,
      },
    }
  }

  if (!input.homeTeamId || !input.awayTeamId) {
    return { ok: false, error: 'El partido aún tiene equipos por definir.' }
  }
  if (input.homeTeamId === input.awayTeamId) {
    return { ok: false, error: 'Los equipos del partido deben ser distintos.' }
  }
  if (!isScore(input.homeGoals) || !isScore(input.awayGoals)) {
    return { ok: false, error: 'Los goles deben ser números enteros entre 0 y 99.' }
  }

  const penaltyHome = input.penaltyHome ?? null
  const penaltyAway = input.penaltyAway ?? null
  const hasPenalties = penaltyHome != null || penaltyAway != null
  const draw = input.homeGoals === input.awayGoals

  if (!definition && hasPenalties) {
    return { ok: false, error: 'Solo los partidos de definición admiten penales.' }
  }

  let decidedBy: DecidedBy | null = input.decidedBy ?? 'REGULAR_TIME'

  if (definition && hasPenalties) {
    if (!draw) {
      return { ok: false, error: 'Los penales solo se registran si el tiempo regular terminó empatado.' }
    }
    if (!isScore(penaltyHome) || !isScore(penaltyAway)) {
      return { ok: false, error: 'Los penales deben ser números enteros entre 0 y 99.' }
    }
    if (penaltyHome === penaltyAway) {
      return { ok: false, error: 'La definición por penales no puede terminar empatada.' }
    }
    decidedBy = 'PENALTIES'
  } else if (definition && draw && input.status === 'FINAL') {
    if (input.drawPolicy === 'PENALTIES_REQUIRED') {
      return {
        ok: false,
        error:
          'Los partidos de definición no pueden cerrar empatados: registra el marcador de los penales.',
      }
    }
    if (decidedBy === 'PENALTIES') decidedBy = 'REGULAR_TIME'
  }

  if (input.status === 'FINAL' && !input.confirmFinal) {
    return { ok: false, error: 'Confirma el cierre del partido para dejarlo como definitivo.' }
  }

  return {
    ok: true,
    value: {
      status: input.status,
      homeGoals: input.homeGoals,
      awayGoals: input.awayGoals,
      penaltyHome: definition && hasPenalties ? penaltyHome : null,
      penaltyAway: definition && hasPenalties ? penaltyAway : null,
      decidedBy: input.status === 'FINAL' ? decidedBy : null,
    },
  }
}
