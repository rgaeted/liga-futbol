import { getFormationSlots } from '@/lib/formations'
import { mergeSlotLayout, type SlotLayout } from '@/lib/formation-slot-layout'
import type { FootballFormat } from '@prisma/client'

export type LineupAssignment = {
  slotKey: string
  playerId: string
  playerName: string
  playerPhotoUrl?: string | null
}

export type LineupBenchPlayer = {
  playerId: string
  playerName: string
}

export type LineupView = {
  scheme: string
  pitch: Array<{
    slotKey: string
    label: string
    row: number
    col: number
    topPct: number
    leftPct: number
    playerId: string | null
    playerName: string | null
    playerPhotoUrl: string | null
  }>
  bench: LineupBenchPlayer[]
}

export function buildLineupView(input: {
  scheme: string
  footballFormat?: FootballFormat
  assignments: LineupAssignment[]
  bench: LineupBenchPlayer[]
  slotLayout?: SlotLayout | null
}): LineupView {
  const format = input.footballFormat ?? 'FUTBOL_11'
  const layout = mergeSlotLayout(input.scheme, format, input.slotLayout)
  const bySlot = new Map(input.assignments.map((a) => [a.slotKey, a]))
  const pitch = getFormationSlots(input.scheme, format).map((slot) => {
    const a = bySlot.get(slot.key)
    const pos = layout[slot.key]
    return {
      slotKey: slot.key,
      label: slot.label,
      row: slot.row,
      col: slot.col,
      topPct: pos.topPct,
      leftPct: pos.leftPct,
      playerId: a?.playerId ?? null,
      playerName: a?.playerName ?? null,
      playerPhotoUrl: a?.playerPhotoUrl ?? null,
    }
  })
  return { scheme: input.scheme, pitch, bench: input.bench }
}
