import { describe, it, expect } from 'vitest'
import { serializePlayerAwardBadge, groupPlayerAwardsBySeason } from '@/lib/player-awards'

describe('player awards', () => {
  it('serializes badge fields for UI', () => {
    const badge = serializePlayerAwardBadge({
      id: 'pa1',
      awardedAt: new Date('2026-09-01T12:00:00.000Z'),
      note: 'Gran torneo',
      season: { id: 's1', name: 'Copa Kelme' },
      orgAward: {
        id: 'a1',
        name: 'Premio al 7 pulmones',
        shortLabel: '7 pulmones',
        emoji: '🫁',
        description: 'Al que más corre',
        accentColor: '#16A34A',
        isActive: true,
      },
    })
    expect(badge.label).toBe('7 pulmones')
    expect(badge.emoji).toBe('🫁')
    expect(badge.seasonName).toBe('Copa Kelme')
    expect(badge.accentColor).toBe('#16A34A')
  })

  it('groups general awards under null season key', () => {
    const grouped = groupPlayerAwardsBySeason([
      {
        seasonId: null,
        seasonName: null,
        badge: { id: '1' } as never,
      },
      {
        seasonId: 's1',
        seasonName: 'Copa',
        badge: { id: '2' } as never,
      },
    ])
    expect(grouped.general).toHaveLength(1)
    expect(grouped.bySeason).toHaveLength(1)
    expect(grouped.bySeason[0]?.seasonName).toBe('Copa')
  })
})
