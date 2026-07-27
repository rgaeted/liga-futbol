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

  it('requires one captain per side', () => {
    expect(
      validateFriendlyRoster([
        { friendlyPlayerId: 'a', side: 'A' },
        { friendlyPlayerId: 'b', side: 'B' },
      ])
    ).toBe('Debes elegir un capitán para el equipo local (lado A)')
  })

  it('accepts roster with captains', () => {
    expect(
      validateFriendlyRoster([
        { friendlyPlayerId: 'a', side: 'A', isCaptain: true },
        { friendlyPlayerId: 'b', side: 'B', isCaptain: true },
      ])
    ).toBeNull()
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

  it('roundtrips sets and entries with captains', () => {
    const { sideAIds, sideBIds, sideACaptainId, sideBCaptainId } = setsFromPlayerSides([
      { friendlyPlayerId: 'a', side: 'A', isCaptain: true },
      { friendlyPlayerId: 'b', side: 'B', isCaptain: true },
    ])
    const entries = rosterEntriesFromSets(sideAIds, sideBIds, sideACaptainId, sideBCaptainId)
    expect(entries).toEqual([
      { friendlyPlayerId: 'a', side: 'A', isCaptain: true },
      { friendlyPlayerId: 'b', side: 'B', isCaptain: true },
    ])
  })
})

describe('updateMatchSchema players', () => {
  it('accepts friendly roster update with captains', () => {
    const result = updateMatchSchema.safeParse({
      players: [
        { friendlyPlayerId: 'fp-1', side: 'A', isCaptain: true },
        { friendlyPlayerId: 'fp-2', side: 'B', isCaptain: true },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects friendly roster update without captains', () => {
    const result = updateMatchSchema.safeParse({
      players: [
        { friendlyPlayerId: 'fp-1', side: 'A' },
        { friendlyPlayerId: 'fp-2', side: 'B' },
      ],
    })
    expect(result.success).toBe(false)
  })
})
