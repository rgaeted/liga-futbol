import { describe, expect, it } from 'vitest'
import { aggregatePlayerCardWindow, trailingStreak } from '@/lib/player-card-window'

describe('trailingStreak', () => {
  it('counts only the newest consecutive trues', () => {
    expect(trailingStreak([true, true, false, true, true, true])).toBe(3)
    expect(trailingStreak([true, true, true, false])).toBe(0)
    expect(trailingStreak([])).toBe(0)
  })
})

describe('aggregatePlayerCardWindow', () => {
  const day = (n: number) => new Date(`2026-08-${10 + n}T15:00:00.000Z`)
  const matches = [
    {
      id: 'm1',
      scheduledAt: day(1),
      sideAName: 'Blancos',
      sideBName: 'Negros',
      roster: [
        { playerId: 'opitz', side: 'A' as const },
        { playerId: 'otro', side: 'B' as const },
      ],
      events: [
        { type: 'GOAL', playerId: 'opitz', assistPlayerId: 'otro' },
        { type: 'GOAL', playerId: 'opitz', assistPlayerId: null },
        { type: 'PENALTY_GOAL', playerId: 'opitz', assistPlayerId: 'otro' },
        { type: 'OWN_GOAL', playerId: 'opitz', assistPlayerId: null },
        { type: 'YELLOW_CARD', playerId: 'opitz', assistPlayerId: null },
      ],
      mvpPlayerIds: ['opitz'],
    },
    {
      id: 'm2',
      scheduledAt: day(2),
      sideAName: 'Blancos',
      sideBName: 'Negros',
      roster: [{ playerId: 'opitz', side: 'B' as const }],
      events: [{ type: 'GOAL', playerId: 'opitz', assistPlayerId: null }],
      mvpPlayerIds: [],
    },
    {
      id: 'm3',
      scheduledAt: day(3),
      sideAName: 'Blancos',
      sideBName: 'Negros',
      roster: [{ playerId: 'otro', side: 'A' as const }],
      events: [],
      mvpPlayerIds: [],
    },
  ]

  it('counts scoring goals not own goals and assists on scoring plays', () => {
    const row = aggregatePlayerCardWindow(matches, 'opitz')
    expect(row.goles).toBe(4)
    expect(row.asistencias).toBe(0)
    expect(row.pj).toBe(2)
    expect(row.presencias).toBe(2)
    expect(row.fechasPosibles).toBe(3)
    expect(row.mvps).toBe(1)
    expect(row.amarillas).toBe(1)
    expect(row.lastSideName).toBe('Negros')
    expect(row.rachaGoleadora).toBe(2)
    expect(row.rachaPresencia).toBe(0)
  })

  it('counts assists on scoring goals for other players', () => {
    expect(aggregatePlayerCardWindow(matches, 'otro').asistencias).toBe(2)
  })
})
