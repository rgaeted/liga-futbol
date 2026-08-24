import { describe, expect, it } from 'vitest'
import { tallyRecentScorers } from '@/lib/org-public-landing'

describe('tallyRecentScorers', () => {
  it('counts GOAL only and ignores OWN_GOAL', () => {
    const scorers = tallyRecentScorers([
      { type: 'GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'OWN_GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'YELLOW_CARD', playerId: 'p2', playerName: 'Ben' },
    ])
    expect(scorers).toEqual([{ name: 'Ana', goals: 2 }])
  })

  it('takes top 5 by goals then name', () => {
    const events = Array.from({ length: 6 }, (_, i) => ({
      type: 'GOAL',
      playerId: `p${i}`,
      playerName: `J${i}`,
    })).concat(
      Array.from({ length: 3 }, () => ({
        type: 'GOAL',
        playerId: 'p0',
        playerName: 'J0',
      })),
    )
    const scorers = tallyRecentScorers(events, 5)
    expect(scorers).toHaveLength(5)
    expect(scorers[0]).toEqual({ name: 'J0', goals: 4 })
  })
})

describe('public landing payload keys', () => {
  it('fixture JSON does not include paid or email', () => {
    const fixture = {
      organization: { name: 'X', slug: 'x', primaryColor: '#fff', logoUrl: null },
      live: [],
      nextMatch: null,
      results: [],
      scorers: [{ name: 'Ana', goals: 1 }],
    }
    const raw = JSON.stringify(fixture)
    expect(raw).not.toMatch(/paid/i)
    expect(raw).not.toMatch(/email/i)
  })
})
