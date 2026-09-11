import { EventType } from '@prisma/client'
import { isScoringGoalEvent } from '@/lib/event-labels'
import { cardPositionFromPlayer } from '@/lib/player-card'
import { ladoDeJugador } from '@/lib/badges/context'
import type { BadgeEvent, BadgeHistory, BadgeMatch, BadgeRosterRow, BadgeSide } from '@/lib/badges/types'

export type MatchPredicateInput = {
  match: BadgeMatch
  playerId: string
  rosterRow: BadgeRosterRow
  history: BadgeHistory
  thresholds: Record<string, number>
  minutoTotal: number
  primerTiempoHasta: number
  scoresAfter: Map<string, { a: number; b: number }>
  finalScore: { a: number; b: number }
  sideAName: string
  sideBName: string
}

export function golesDelJugador(match: BadgeMatch, playerId: string): BadgeEvent[] {
  return match.events.filter(
    (event) =>
      isScoringGoalEvent(event.type as EventType) && event.playerId === playerId,
  )
}

function asistenciasDelJugador(match: BadgeMatch, playerId: string): BadgeEvent[] {
  return match.events.filter(
    (event) =>
      isScoringGoalEvent(event.type as EventType) && event.assistPlayerId === playerId,
  )
}

function scoreBeforeEvent(
  events: BadgeEvent[],
  eventId: string,
  scoresAfter: Map<string, { a: number; b: number }>,
): { a: number; b: number } {
  let previous = { a: 0, b: 0 }
  for (const event of events) {
    if (event.id === eventId) return previous
    const after = scoresAfter.get(event.id)
    if (after) previous = after
  }
  return previous
}

function sideGoals(score: { a: number; b: number }, side: BadgeSide): number {
  return side === 'A' ? score.a : score.b
}

function sideDeficit(score: { a: number; b: number }, side: BadgeSide): number {
  const ours = sideGoals(score, side)
  const theirs = side === 'A' ? score.b : score.a
  return theirs - ours
}

function sideWins(score: { a: number; b: number }, side: BadgeSide): boolean {
  const ours = sideGoals(score, side)
  const theirs = side === 'A' ? score.b : score.a
  return ours > theirs
}

function formatMarcador(
  score: { a: number; b: number },
  sideAName: string,
  sideBName: string,
  minute?: number,
): string {
  const base = `${sideAName} ${score.a}-${score.b} ${sideBName}`
  if (minute !== undefined) return `${minute}' · ${base}`
  return base
}

function goalsAgainstSideInPeriod(
  events: BadgeEvent[],
  side: BadgeSide,
  maxMinute: number,
): number {
  let count = 0
  for (const event of events) {
    if (event.minute > maxMinute || !event.side) continue
    if (isScoringGoalEvent(event.type as EventType)) {
      if (event.side !== side) count += 1
    } else if (event.type === 'OWN_GOAL') {
      if (event.side === side) count += 1
    }
  }
  return count
}

function goalsAgainstSide(events: BadgeEvent[], side: BadgeSide): number {
  return goalsAgainstSideInPeriod(events, side, Number.POSITIVE_INFINITY)
}

function playerInvolvements(match: BadgeMatch, playerId: string): BadgeEvent[] {
  return match.events.filter((event) => {
    if (!isScoringGoalEvent(event.type as EventType)) return false
    return event.playerId === playerId || event.assistPlayerId === playerId
  })
}

function golUltimaHora(input: MatchPredicateInput): string | null {
  const ultimoPct = input.thresholds.ultimoPct ?? 15
  const ganaPor = input.thresholds.ganaPor ?? 1
  const thresholdMinute = input.minutoTotal * (1 - ultimoPct / 100)
  const playerSide = ladoDeJugador(input.match.roster, input.playerId)
  if (!playerSide) return null

  for (const goal of golesDelJugador(input.match, input.playerId)) {
    if (goal.minute < thresholdMinute) continue
    const after = input.scoresAfter.get(goal.id)
    if (!after) continue
    if (sideGoals(after, playerSide) - sideGoals(after, playerSide === 'A' ? 'B' : 'A') !== ganaPor) {
      continue
    }
    if (
      sideGoals(input.finalScore, playerSide) -
        sideGoals(input.finalScore, playerSide === 'A' ? 'B' : 'A') !==
      ganaPor
    ) {
      continue
    }
    return formatMarcador(after, input.sideAName, input.sideBName, goal.minute)
  }
  return null
}

function heroeRemontada(input: MatchPredicateInput): string | null {
  const abajoPor = input.thresholds.abajoPor ?? 2
  const playerSide = ladoDeJugador(input.match.roster, input.playerId)
  if (!playerSide || !sideWins(input.finalScore, playerSide)) return null

  for (const event of playerInvolvements(input.match, input.playerId)) {
    const before = scoreBeforeEvent(input.match.events, event.id, input.scoresAfter)
    if (sideDeficit(before, playerSide) >= abajoPor) {
      return formatMarcador(input.finalScore, input.sideAName, input.sideBName)
    }
  }
  return null
}

function manoHelada(input: MatchPredicateInput): string | null {
  const ultimoCuartoPct = input.thresholds.ultimoCuartoPct ?? 25
  const thresholdMinute = input.minutoTotal * (1 - ultimoCuartoPct / 100)
  const playerSide = ladoDeJugador(input.match.roster, input.playerId)
  if (!playerSide) return null

  for (const goal of golesDelJugador(input.match, input.playerId)) {
    if (goal.minute < thresholdMinute) continue
    const before = scoreBeforeEvent(input.match.events, goal.id, input.scoresAfter)
    if (before.a !== before.b) continue
    const after = input.scoresAfter.get(goal.id)
    if (!after || !sideWins(after, playerSide)) continue
    return formatMarcador(after, input.sideAName, input.sideBName, goal.minute)
  }
  return null
}

function dobleteExpress(input: MatchPredicateInput): string | null {
  const goles = input.thresholds.goles ?? 2
  const minutos = input.thresholds.minutos ?? 10
  const minutes = golesDelJugador(input.match, input.playerId)
    .map((goal) => goal.minute)
    .sort((a, b) => a - b)

  for (let i = 0; i <= minutes.length - goles; i += 1) {
    if (minutes[i + goles - 1]! - minutes[i]! <= minutos) {
      return `${goles} goles en ${minutos} min · ${formatMarcador(input.finalScore, input.sideAName, input.sideBName)}`
    }
  }
  return null
}

function elUltimoEnRendirse(input: MatchPredicateInput): string | null {
  const abajoPor = input.thresholds.abajoPor ?? 3
  const playerSide = ladoDeJugador(input.match.roster, input.playerId)
  if (!playerSide) return null

  for (const event of playerInvolvements(input.match, input.playerId)) {
    const before = scoreBeforeEvent(input.match.events, event.id, input.scoresAfter)
    if (sideDeficit(before, playerSide) >= abajoPor) {
      return formatMarcador(before, input.sideAName, input.sideBName, event.minute)
    }
  }
  return null
}

function hatTrick(input: MatchPredicateInput): string | null {
  const goles = input.thresholds.goles ?? 3
  const count = golesDelJugador(input.match, input.playerId).length
  if (count < goles) return null
  return `${count} goles · ${formatMarcador(input.finalScore, input.sideAName, input.sideBName)}`
}

function poker(input: MatchPredicateInput): string | null {
  const goles = input.thresholds.goles ?? 4
  const count = golesDelJugador(input.match, input.playerId).length
  if (count < goles) return null
  return `${count} goles · ${formatMarcador(input.finalScore, input.sideAName, input.sideBName)}`
}

function abrioLaLata(input: MatchPredicateInput): string | null {
  const firstGoal = input.match.events.find(
    (event) => isScoringGoalEvent(event.type as EventType) && event.playerId,
  )
  if (!firstGoal || firstGoal.playerId !== input.playerId) return null
  const after = input.scoresAfter.get(firstGoal.id) ?? input.finalScore
  return formatMarcador(after, input.sideAName, input.sideBName, firstGoal.minute)
}

function sentencio(input: MatchPredicateInput): string | null {
  const diferencia = input.thresholds.diferencia ?? 3
  const playerSide = ladoDeJugador(input.match.roster, input.playerId)
  if (!playerSide) return null

  for (const goal of golesDelJugador(input.match, input.playerId)) {
    const after = input.scoresAfter.get(goal.id)
    if (!after || !sideWins(after, playerSide)) continue
    if (Math.abs(after.a - after.b) >= diferencia) {
      return formatMarcador(after, input.sideAName, input.sideBName, goal.minute)
    }
  }
  return null
}

function verdugo(input: MatchPredicateInput): string | null {
  const goles = input.thresholds.goles ?? 3
  const count = golesDelJugador(input.match, input.playerId).length
  if (count < goles) return null
  return `${count} goles · ${formatMarcador(input.finalScore, input.sideAName, input.sideBName)}`
}

function arquitecto(input: MatchPredicateInput): string | null {
  const asistencias = input.thresholds.asistencias ?? 3
  const count = asistenciasDelJugador(input.match, input.playerId).length
  if (count < asistencias) return null
  return `${count} asistencias · ${formatMarcador(input.finalScore, input.sideAName, input.sideBName)}`
}

function sociedad(input: MatchPredicateInput): string | null {
  const asistencias = input.thresholds.asistencias ?? 3
  const byScorer = new Map<string, number>()
  for (const event of asistenciasDelJugador(input.match, input.playerId)) {
    if (!event.playerId) continue
    byScorer.set(event.playerId, (byScorer.get(event.playerId) ?? 0) + 1)
  }
  for (const [scorerId, count] of byScorer) {
    if (count >= asistencias) {
      return `${count} asistencias a ${scorerId} · ${formatMarcador(input.finalScore, input.sideAName, input.sideBName)}`
    }
  }
  return null
}

function tacoDeOro(input: MatchPredicateInput): string | null {
  const goles = golesDelJugador(input.match, input.playerId).length
  const asistencias = asistenciasDelJugador(input.match, input.playerId).length
  if (goles < 1 || asistencias < 1) return null
  return formatMarcador(input.finalScore, input.sideAName, input.sideBName)
}

function bandejaDePlata(input: MatchPredicateInput): string | null {
  const assists = asistenciasDelJugador(input.match, input.playerId)
  if (assists.length < 1) return null
  const first = assists[0]!
  return formatMarcador(input.finalScore, input.sideAName, input.sideBName, first.minute)
}

function vallaInvicta(input: MatchPredicateInput): string | null {
  const position = cardPositionFromPlayer(
    input.rosterRow.primaryPosition,
    input.rosterRow.position,
  )
  if (position !== 'POR') return null

  const playerSide = ladoDeJugador(input.match.roster, input.playerId)
  if (!playerSide) return null
  if (goalsAgainstSide(input.match.events, playerSide) !== 0) return null
  return formatMarcador(input.finalScore, input.sideAName, input.sideBName)
}

function muro(input: MatchPredicateInput): string | null {
  const golesRecibidosMax = input.thresholds.golesRecibidosMax ?? 1
  const position = cardPositionFromPlayer(
    input.rosterRow.primaryPosition,
    input.rosterRow.position,
  )
  if (position !== 'POR') return null

  const playerSide = ladoDeJugador(input.match.roster, input.playerId)
  if (!playerSide || !sideWins(input.finalScore, playerSide)) return null
  if (goalsAgainstSide(input.match.events, playerSide) > golesRecibidosMax) return null
  return formatMarcador(input.finalScore, input.sideAName, input.sideBName)
}

function pichangaLimpia(input: MatchPredicateInput): string | null {
  const playerSide = ladoDeJugador(input.match.roster, input.playerId)
  if (!playerSide || !sideWins(input.finalScore, playerSide)) return null
  if (goalsAgainstSideInPeriod(input.match.events, playerSide, input.primerTiempoHasta) !== 0) {
    return null
  }
  return formatMarcador(input.finalScore, input.sideAName, input.sideBName)
}

function enContra(input: MatchPredicateInput): string | null {
  const ownGoal = input.match.events.find(
    (event) => event.type === 'OWN_GOAL' && event.playerId === input.playerId,
  )
  if (!ownGoal) return null
  const after = input.scoresAfter.get(ownGoal.id) ?? input.finalScore
  return formatMarcador(after, input.sideAName, input.sideBName, ownGoal.minute)
}

function elShow(input: MatchPredicateInput): string | null {
  if (!input.match.mvpPlayerIds.includes(input.playerId)) return null
  return formatMarcador(input.finalScore, input.sideAName, input.sideBName)
}

function primerGol(input: MatchPredicateInput): string | null {
  if (golesDelJugador(input.match, input.playerId).length < 1) return null
  return formatMarcador(input.finalScore, input.sideAName, input.sideBName)
}

const MATCH_PREDICATES: Record<string, (input: MatchPredicateInput) => string | null> = {
  gol_ultima_hora: golUltimaHora,
  heroe_remontada: heroeRemontada,
  mano_helada: manoHelada,
  doblete_express: dobleteExpress,
  el_ultimo_en_rendirse: elUltimoEnRendirse,
  hat_trick: hatTrick,
  poker: poker,
  abrio_la_lata: abrioLaLata,
  sentencio: sentencio,
  verdugo: verdugo,
  arquitecto: arquitecto,
  sociedad: sociedad,
  taco_de_oro: tacoDeOro,
  bandeja_de_plata: bandejaDePlata,
  valla_invicta: vallaInvicta,
  muro: muro,
  pichanga_limpia: pichangaLimpia,
  en_contra: enContra,
  el_show: elShow,
  primer_gol: primerGol,
}

const STUB_PREDICATE_IDS = new Set([
  'nunca_falla',
  'puntual',
  'todoterreno',
  'el_fundador',
  'caballero',
  'tarjetero',
  'club_50',
  'centurion_asist',
  'kilometrero',
])

export function evaluateMatchPredicate(
  predicateId: string,
  input: MatchPredicateInput,
): string | null {
  if (STUB_PREDICATE_IDS.has(predicateId)) return null
  const predicate = MATCH_PREDICATES[predicateId]
  if (!predicate) return null
  return predicate(input)
}
