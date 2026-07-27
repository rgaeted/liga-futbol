import { describe, it, expect } from 'vitest'
import {
  captainsFromRoster,
  friendlyCaptainPlayerIds,
  resolveFriendlyCaptains,
  validateFriendlyCaptains,
} from '@/lib/friendly-match-captain'

describe('validateFriendlyCaptains', () => {
  it('requires exactly one captain per side', () => {
    expect(
      validateFriendlyCaptains([
        { friendlyPlayerId: 'a', side: 'A' },
        { friendlyPlayerId: 'b', side: 'B' },
      ])
    ).toBe('Debes elegir un capitán para el equipo local (lado A)')

    expect(
      validateFriendlyCaptains([
        { friendlyPlayerId: 'a', side: 'A', isCaptain: true },
        { friendlyPlayerId: 'b', side: 'B' },
      ])
    ).toBe('Debes elegir un capitán para el equipo visitante (lado B)')

    expect(
      validateFriendlyCaptains([
        { friendlyPlayerId: 'a', side: 'A', isCaptain: true },
        { friendlyPlayerId: 'a2', side: 'A', isCaptain: true },
        { friendlyPlayerId: 'b', side: 'B', isCaptain: true },
      ])
    ).toBe('Debes elegir un capitán para el equipo local (lado A)')
  })

  it('accepts one captain per side', () => {
    expect(
      validateFriendlyCaptains([
        { friendlyPlayerId: 'a', side: 'A', isCaptain: true },
        { friendlyPlayerId: 'b', side: 'B', isCaptain: true },
      ])
    ).toBeNull()
  })
})

describe('captainsFromRoster', () => {
  it('extracts captain ids by side', () => {
    expect(
      captainsFromRoster([
        { friendlyPlayerId: 'a', side: 'A', isCaptain: true },
        { friendlyPlayerId: 'b', side: 'B', isCaptain: true },
      ])
    ).toEqual({ sideACaptainId: 'a', sideBCaptainId: 'b' })
  })
})

describe('resolveFriendlyCaptains', () => {
  it('returns captain labels for live display', () => {
    const captains = resolveFriendlyCaptains([
      {
        friendlyPlayerId: 'a',
        side: 'A',
        isCaptain: true,
        friendlyPlayer: { firstName: 'Juan', lastName: 'Pérez' },
      },
      {
        friendlyPlayerId: 'b',
        side: 'B',
        isCaptain: false,
        friendlyPlayer: { firstName: 'Ana', lastName: 'Silva' },
      },
      {
        friendlyPlayerId: 'c',
        side: 'B',
        isCaptain: true,
        friendlyPlayer: { firstName: 'Pedro', lastName: 'Gómez' },
      },
    ])

    expect(captains).toEqual([
      { side: 'A', playerId: 'a', label: 'Juan Pérez' },
      { side: 'B', playerId: 'c', label: 'Pedro Gómez' },
    ])
    expect(friendlyCaptainPlayerIds(captains)).toEqual(['a', 'c'])
  })
})
