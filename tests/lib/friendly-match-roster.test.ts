import { describe, it, expect } from 'vitest'
import { validateFriendlyRoster } from '@/lib/friendly-match-roster'
import { updateMatchSchema } from '@/lib/validations/match'
import {
  rosterEntriesFromSets,
  setsFromPlayerSides,
  setPlayerSide,
} from '@/lib/friendly-match-roster-ui'

describe('validateFriendlyRoster', () => {
  it('requires at least one player per side', () => {
    expect(
      validateFriendlyRoster([{ playerId: 'a', side: 'A' }])
    ).toBe('Debe haber al menos un jugador por lado')
  })

  it('requires one captain per side', () => {
    expect(
      validateFriendlyRoster([
        { playerId: 'a', side: 'A' },
        { playerId: 'b', side: 'B' },
      ])
    ).toBe('Debes elegir un capitán para el equipo local (lado A)')
  })

  it('accepts roster with captains and coaches', () => {
    expect(
      validateFriendlyRoster([
        { playerId: 'a', side: 'A', isCaptain: true, isCoach: true },
        { playerId: 'b', side: 'B', isCaptain: true, isCoach: true },
      ])
    ).toBeNull()
  })

  it('rejects duplicate players', () => {
    expect(
      validateFriendlyRoster([
        { playerId: 'a', side: 'A' },
        { playerId: 'a', side: 'B' },
      ])
    ).toBe('Un jugador no puede estar dos veces en el mismo partido')
  })
})

describe('friendly roster helpers', () => {
  it('moves player between sides', () => {
    const first = setPlayerSide({
      playerId: 'p1',
      side: 'A',
      sideAIds: new Set(),
      sideBIds: new Set(),
      sideACaptainId: null,
      sideBCaptainId: null,
      sideACoachId: null,
      sideBCoachId: null,
    })
    expect(first.sideAIds.has('p1')).toBe(true)

    const moved = setPlayerSide({
      playerId: 'p1',
      side: 'B',
      sideAIds: first.sideAIds,
      sideBIds: first.sideBIds,
      sideACaptainId: null,
      sideBCaptainId: null,
      sideACoachId: null,
      sideBCoachId: null,
    })
    expect(moved.sideAIds.has('p1')).toBe(false)
    expect(moved.sideBIds.has('p1')).toBe(true)
  })

  it('roundtrips sets and entries with captains and coaches', () => {
    const { sideAIds, sideBIds, sideACaptainId, sideBCaptainId, sideACoachId, sideBCoachId } =
      setsFromPlayerSides([
        { friendlyPlayerId: 'a', side: 'A', isCaptain: true, isCoach: true },
        { friendlyPlayerId: 'b', side: 'B', isCaptain: true, isCoach: true },
      ])
    const entries = rosterEntriesFromSets(
      sideAIds,
      sideBIds,
      sideACaptainId,
      sideBCaptainId,
      sideACoachId,
      sideBCoachId
    )
    expect(entries).toEqual([
      { friendlyPlayerId: 'a', side: 'A', isCaptain: true, isCoach: true },
      { friendlyPlayerId: 'b', side: 'B', isCaptain: true, isCoach: true },
    ])
  })
})

describe('updateMatchSchema players', () => {
  it('accepts friendly roster update with captains and coaches', () => {
    const result = updateMatchSchema.safeParse({
      players: [
        { friendlyPlayerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
        { friendlyPlayerId: 'fp-2', side: 'B', isCaptain: true, isCoach: true },
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
