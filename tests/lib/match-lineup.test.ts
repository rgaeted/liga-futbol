import { describe, it, expect } from 'vitest'
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
})
