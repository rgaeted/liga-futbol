import type { FootballFormat } from '@prisma/client'
import { getFormationSlots } from '@/lib/formations'

/** 0 = arquero, 1 = defensa, 2 = mediocampo, 3 = ataque */
export type PositionBand = 0 | 1 | 2 | 3

export type FormationFitPlayer = {
  id: string
  label?: string
  primaryPosition?: string | null
  secondaryPosition?: string | null
}

export type FormationFitAssignmentDetail = {
  slotKey: string
  slotLabel: string
  playerId: string
  playerLabel: string
  positionLabel: string | null
  score: number
}

export type FormationFitResult = {
  percentage: number | null
  message: string
  assignments: FormationFitAssignmentDetail[]
  mismatches: FormationFitAssignmentDetail[]
}

const FRIENDLY_BAND: Record<string, PositionBand> = {
  Arquero: 0,
  'Defensa central': 1,
  'Lateral derecho': 1,
  'Lateral izquierdo': 1,
  'Mediocampista defensivo': 2,
  Mediocampista: 2,
  'Mediocampista ofensivo': 2,
  'Extremo derecho': 3,
  'Extremo izquierdo': 3,
  Delantero: 3,
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

export function playerPositionBand(position: string | null | undefined): PositionBand | null {
  if (!position?.trim()) return null

  const exact = FRIENDLY_BAND[position.trim()]
  if (exact !== undefined) return exact

  const p = normalizeText(position)
  if (/arquero|portero|guardameta/.test(p)) return 0
  if (/lateral|carrilero|wing back|wingback/.test(p)) return 1
  if (/defensa|defensor|central|zaguero|stopper|back/.test(p)) return 1
  if (/mediocampista defensivo|pivote|contencion|volante defensivo|mcd/.test(p)) return 2
  if (/mediocampista ofensivo|enganche|media punta|punta|meia/.test(p)) return 2
  if (/mediocamp|volante|interior|midfield/.test(p)) return 2
  if (/extremo|wing|winger/.test(p)) return 3
  if (/delantero|atacante|centro delantero|ariete|striker|forward/.test(p)) return 3

  return null
}

export function slotPositionBand(
  slotKey: string,
  scheme: string,
  footballFormat: FootballFormat
): PositionBand {
  const slot = getFormationSlots(scheme, footballFormat).find((s) => s.key === slotKey)
  if (!slot) return 2

  const row = slot.row
  if (row <= 0) return 0
  if (row === 1) return 1
  if (row === 2) return 2
  return 3
}

export function positionFitScore(slotBand: PositionBand, playerBand: PositionBand): number {
  const distance = Math.abs(slotBand - playerBand)
  if (distance === 0) return 100
  if (distance === 1) return 68
  if (distance === 2) return 35
  return 12
}

function bestPlayerScore(
  slotBand: PositionBand,
  primaryPosition?: string | null,
  secondaryPosition?: string | null
): { score: number; positionLabel: string | null } | null {
  const primaryBand = playerPositionBand(primaryPosition)
  const secondaryBand = playerPositionBand(secondaryPosition)

  let best: { score: number; positionLabel: string | null } | null = null

  if (primaryBand !== null && primaryPosition?.trim()) {
    best = {
      score: positionFitScore(slotBand, primaryBand),
      positionLabel: primaryPosition.trim(),
    }
  }

  if (secondaryBand !== null && secondaryPosition?.trim()) {
    const secondaryScore = positionFitScore(slotBand, secondaryBand)
    if (!best || secondaryScore > best.score) {
      best = {
        score: secondaryScore,
        positionLabel: secondaryPosition.trim(),
      }
    }
  }

  return best
}

export function formationFitMessage(percentage: number): string {
  if (percentage >= 90) return '¡Plantilla de lujo!'
  if (percentage >= 75) return 'Buen ojo táctico'
  if (percentage >= 60) return 'Hay detalles por pulir'
  if (percentage >= 40) return 'Mezclaste peras con limones'
  return '¿Estás probando posiciones?'
}

export function calculateFormationFit(input: {
  scheme: string
  footballFormat: FootballFormat
  slots: Record<string, string>
  players: FormationFitPlayer[]
}): FormationFitResult {
  const playerById = new Map(input.players.map((p) => [p.id, p]))
  const assignments: FormationFitAssignmentDetail[] = []

  for (const [slotKey, playerId] of Object.entries(input.slots)) {
    const player = playerById.get(playerId)
    if (!player) continue

    const slotBand = slotPositionBand(slotKey, input.scheme, input.footballFormat)
    const fit = bestPlayerScore(slotBand, player.primaryPosition, player.secondaryPosition)
    if (!fit) continue

    const slotLabel =
      getFormationSlots(input.scheme, input.footballFormat).find((s) => s.key === slotKey)?.label ??
      slotKey

    assignments.push({
      slotKey,
      slotLabel,
      playerId,
      playerLabel: player.label ?? playerId,
      positionLabel: fit.positionLabel,
      score: fit.score,
    })
  }

  if (assignments.length === 0) {
    return {
      percentage: null,
      message: 'Asigna titulares con posición conocida para ver el acierto',
      assignments: [],
      mismatches: [],
    }
  }

  const percentage = Math.round(
    assignments.reduce((sum, row) => sum + row.score, 0) / assignments.length
  )

  const mismatches = [...assignments]
    .filter((row) => row.score < 68)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)

  return {
    percentage,
    message: formationFitMessage(percentage),
    assignments,
    mismatches,
  }
}

export function formationFitTone(percentage: number): 'great' | 'good' | 'fair' | 'poor' {
  if (percentage >= 85) return 'great'
  if (percentage >= 65) return 'good'
  if (percentage >= 45) return 'fair'
  return 'poor'
}

export function playerFitScoreForSlot(
  slotKey: string,
  scheme: string,
  footballFormat: FootballFormat,
  player: FormationFitPlayer
): number | null {
  const slotBand = slotPositionBand(slotKey, scheme, footballFormat)
  const fit = bestPlayerScore(slotBand, player.primaryPosition, player.secondaryPosition)
  return fit?.score ?? null
}
