import type { FootballFormat } from '@prisma/client'
import { slotTopPercent } from '@/lib/formation-layout'
import { getFormationSlots } from '@/lib/formations'

export type SlotLayout = Record<string, { topPct: number; leftPct: number }>

export function defaultSlotPercents(
  row: number,
  col: number,
  maxRow: number,
  compact: boolean
): { topPct: number; leftPct: number } {
  return {
    topPct: slotTopPercent(row, maxRow, 'editor', compact),
    leftPct: col * 100,
  }
}

export function mergeSlotLayout(
  scheme: string,
  format: FootballFormat,
  layout?: SlotLayout | null
): SlotLayout {
  const slots = getFormationSlots(scheme, format)
  const maxRow = Math.max(...slots.map((s) => s.row), 0)
  const compact = slots.length < 11
  const overrides = layout ?? {}

  const merged: SlotLayout = {}
  for (const slot of slots) {
    merged[slot.key] = overrides[slot.key] ?? defaultSlotPercents(slot.row, slot.col, maxRow, compact)
  }
  return merged
}

export function validateSlotLayout(
  scheme: string,
  format: FootballFormat,
  layout: SlotLayout
): { ok: true } | { ok: false; error: string } {
  const validKeys = new Set(getFormationSlots(scheme, format).map((s) => s.key))

  for (const key of Object.keys(layout)) {
    if (key === 'GK') {
      return { ok: false, error: 'No se puede ajustar la posición del arquero' }
    }
    if (!validKeys.has(key)) {
      return { ok: false, error: `Posición desconocida: ${key}` }
    }
    const entry = layout[key]
    if (
      !Number.isFinite(entry.topPct) ||
      !Number.isFinite(entry.leftPct) ||
      entry.topPct < 5 ||
      entry.topPct > 95 ||
      entry.leftPct < 5 ||
      entry.leftPct > 95
    ) {
      return { ok: false, error: `Coordenadas inválidas para ${key}` }
    }
  }

  return { ok: true }
}
