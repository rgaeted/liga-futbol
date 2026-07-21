import { describe, it, expect } from 'vitest'
import { validateFriendlyRoster } from '@/lib/friendly-match-roster'
import { updateMatchSchema } from '@/lib/validations/match'
import {
  rosterEntriesFromSets,
  setsFromPlayerSides,
  toggleFriendlyRosterSide,
} from '@/components/admin/FriendlyMatchRosterEditor'

describe('validateFriendlyRoster', () => {
  it('requires at least one player per side', () => {
    expect(
      validateFriendlyRoster([{ friendlyPlayerId: 'a', side: 'A' }])
    ).toBe('Debe haber al menos un jugador por lado')
  })

  it('rejects duplicate players', () => {
    expect(
      validateFriendlyRoster([
        { friendlyPlayerId: 'a', side: 'A' },
        { friendlyPlayerId: 'a', side: 'B' },
      ])
    ).toBe('Un jugador no puede estar dos veces en el mismo partido')
  })
})

describe('friendly roster helpers', () => {
  it('toggles player between sides', () => {
    const first = toggleFriendlyRosterSide('A', 'p1', true, new Set(), new Set())
    expect(first.sideAIds.has('p1')).toBe(true)

    const moved = toggleFriendlyRosterSide('B', 'p1', true, first.sideAIds, first.sideBIds)
    expect(moved.sideAIds.has('p1')).toBe(false)
    expect(moved.sideBIds.has('p1')).toBe(true)
  })

  it('roundtrips sets and entries', () => {
    const { sideAIds, sideBIds } = setsFromPlayerSides([
      { friendlyPlayerId: 'a', side: 'A' },
      { friendlyPlayerId: 'b', side: 'B' },
    ])
    const entries = rosterEntriesFromSets(sideAIds, sideBIds)
    expect(entries).toHaveLength(2)
  })
})

describe('updateMatchSchema players', () => {
  it('accepts friendly roster update', () => {
    const result = updateMatchSchema.safeParse({
      players: [
        { friendlyPlayerId: 'fp-1', side: 'A' },
        { friendlyPlayerId: 'fp-2', side: 'B' },
      ],
    })
    expect(result.success).toBe(true)
  })
})
