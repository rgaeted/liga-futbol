import { describe, it, expect } from 'vitest'
import { mergeSlotLayout } from '@/lib/formation-slot-layout'
import { buildLineupView } from '@/lib/match-lineup'

describe('buildLineupView', () => {
  it('maps slots to players and leaves empty slots', () => {
    const view = buildLineupView({
      scheme: '4-3-3',
      assignments: [{ slotKey: 'GK', playerId: 'p1', playerName: 'Arquero Uno' }],
      bench: [{ playerId: 'p2', playerName: 'Suplente' }],
    })
    expect(view.scheme).toBe('4-3-3')
    expect(view.pitch.find((s) => s.slotKey === 'GK')?.playerName).toBe('Arquero Uno')
    expect(view.pitch.find((s) => s.slotKey === 'ST')?.playerName).toBeNull()
    expect(view.bench).toEqual([{ playerId: 'p2', playerName: 'Suplente' }])
  })

  it('includes default topPct and leftPct for each slot', () => {
    const view = buildLineupView({
      scheme: '4-4-2',
      assignments: [],
      bench: [],
    })
    const merged = mergeSlotLayout('4-4-2', 'FUTBOL_11')
    for (const slot of view.pitch) {
      expect(slot.topPct).toBe(merged[slot.slotKey].topPct)
      expect(slot.leftPct).toBe(merged[slot.slotKey].leftPct)
    }
  })

  it('applies slotLayout overrides on top of defaults', () => {
    const view = buildLineupView({
      scheme: '4-4-2',
      assignments: [],
      bench: [],
      slotLayout: { CM_L: { topPct: 50, leftPct: 50 } },
    })
    const cmL = view.pitch.find((s) => s.slotKey === 'CM_L')
    expect(cmL?.topPct).toBe(50)
    expect(cmL?.leftPct).toBe(50)
    const gk = view.pitch.find((s) => s.slotKey === 'GK')
    expect(gk?.topPct).toBe(mergeSlotLayout('4-4-2', 'FUTBOL_11').GK.topPct)
  })
})
