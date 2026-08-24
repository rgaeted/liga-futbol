import { describe, expect, it } from 'vitest'
import { defaultSlotPercents, mergeSlotLayout, validateSlotLayout } from '@/lib/formation-slot-layout'

describe('defaultSlotPercents', () => {
  it('maps catalog row/col to percentages', () => {
    const gk = defaultSlotPercents(0, 0.5, 3, false)
    expect(gk.topPct).toBeGreaterThan(80)
    expect(gk.leftPct).toBe(50)
  })
})

describe('mergeSlotLayout', () => {
  it('applies overrides on top of defaults for 4-4-2', () => {
    const merged = mergeSlotLayout('4-4-2', 'FUTBOL_11', {
      CM_L: { topPct: 50, leftPct: 50 },
    })
    expect(merged.CM_L).toEqual({ topPct: 50, leftPct: 50 })
    expect(merged.GK.leftPct).toBe(50)
  })
})

describe('validateSlotLayout', () => {
  it('rejects unknown slot keys', () => {
    const result = validateSlotLayout('4-4-2', 'FUTBOL_11', { FAKE: { topPct: 50, leftPct: 50 } })
    expect(result.ok).toBe(false)
  })

  it('rejects GK override', () => {
    const result = validateSlotLayout('4-4-2', 'FUTBOL_11', { GK: { topPct: 10, leftPct: 10 } })
    expect(result.ok).toBe(false)
  })
})
