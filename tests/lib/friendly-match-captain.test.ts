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
        { playerId: 'a', side: 'A' },
        { playerId: 'b', side: 'B' },
      ])
    ).toBe('Debes elegir un capitán para el equipo local (lado A)')

    expect(
      validateFriendlyCaptains([
        { playerId: 'a', side: 'A', isCaptain: true },
        { playerId: 'b', side: 'B' },
      ])
    ).toBe('Debes elegir un capitán para el equipo visitante (lado B)')

    expect(
      validateFriendlyCaptains([
        { playerId: 'a', side: 'A', isCaptain: true },
        { playerId: 'a2', side: 'A', isCaptain: true },
        { playerId: 'b', side: 'B', isCaptain: true },
      ])
    ).toBe('Debes elegir un capitán para el equipo local (lado A)')
  })

  it('accepts one captain per side', () => {
    expect(
      validateFriendlyCaptains([
        { playerId: 'a', side: 'A', isCaptain: true },
        { playerId: 'b', side: 'B', isCaptain: true },
      ])
    ).toBeNull()
  })
})

describe('captainsFromRoster', () => {
  it('extracts captain ids by side', () => {
    expect(
      captainsFromRoster([
        { playerId: 'a', side: 'A', isCaptain: true },
        { playerId: 'b', side: 'B', isCaptain: true },
      ])
    ).toEqual({ sideACaptainId: 'a', sideBCaptainId: 'b' })
  })
})

describe('resolveFriendlyCaptains', () => {
  it('returns captain labels for live display', () => {
    const captains = resolveFriendlyCaptains([
      {
        playerId: 'a',
        side: 'A',
        isCaptain: true,
        player: { person: { firstName: 'Juan', lastName: 'Pérez', user: null } },
      },
      {
        playerId: 'b',
        side: 'B',
        isCaptain: false,
        player: { person: { firstName: 'Ana', lastName: 'Silva', user: null } },
      },
      {
        playerId: 'c',
        side: 'B',
        isCaptain: true,
        player: { person: { firstName: 'Pedro', lastName: 'Gómez', user: null } },
      },
    ])

    expect(captains).toEqual([
      { side: 'A', playerId: 'a', label: 'Juan Pérez' },
      { side: 'B', playerId: 'c', label: 'Pedro Gómez' },
    ])
    expect(friendlyCaptainPlayerIds(captains)).toEqual(['a', 'c'])
  })
})
