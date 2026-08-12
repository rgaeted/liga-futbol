import { describe, expect, it } from 'vitest'
import { EventType } from '@prisma/client'
import { aggregateSeasonPlayerStats } from '@/lib/mobile/season-stats'

const roster = [
  {
    rosterEntryId: 'r1',
    playerId: 'p1',
    playerName: 'Juan',
    teamName: 'Rojo',
    jerseyNumber: 10,
    position: 'Delantero',
  },
]

describe('aggregateSeasonPlayerStats', () => {
  it('ignores events from other seasons and global player counters', () => {
    const stats = aggregateSeasonPlayerStats(
      [
        {
          type: EventType.GOAL,
          playerId: 'p1',
          assistPlayerId: null,
          match: { seasonId: 'season-1' },
        },
        {
          type: EventType.GOAL,
          playerId: 'p1',
          assistPlayerId: null,
          match: { seasonId: 'season-2' },
        },
      ],
      [],
      roster,
      'season-1',
      [{ playerId: 'p1', goals: 99, assists: 99, yellowCards: 99, redCards: 99 }],
    )

    expect(stats.scorers[0]).toMatchObject({ value: 1, stats: { goals: 1, assists: 0, yellowCards: 0, redCards: 0, mvpCount: 0 } })
  })
})
