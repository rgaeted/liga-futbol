import { describe, it, expect } from 'vitest'
import { validateFriendlyRoster } from '@/lib/friendly-match-roster'
import { updateMatchSchema } from '@/lib/validations/match'
import {
  rosterEntriesFromSets,
  setsFromPlayerSides,
  setPlayerSide,
} from '@/lib/friendly-match-roster-ui'

describe('validateFriendlyRoster', () => {
  it('accepts pool-only players without sides or captains', () => {
    expect(
      validateFriendlyRoster([
        { playerId: 'a' },
        { playerId: 'b', side: null },
      ])
    ).toBeNull()
  })

  it('requires captain and coach only for sides that have players', () => {
    expect(
      validateFriendlyRoster([
        { playerId: 'a', side: 'A' },
        { playerId: 'pool' },
      ])
    ).toBe('Debes elegir un capitán para el equipo local (lado A)')
  })

  it('accepts one side assigned with captain/coach and pool players', () => {
    expect(
      validateFriendlyRoster([
        { playerId: 'a', side: 'A', isCaptain: true, isCoach: true },
        { playerId: 'pool' },
      ])
    ).toBeNull()
  })

  it('accepts roster with captains and coaches on both sides', () => {
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
        { playerId: 'a', side: 'A', isCaptain: true, isCoach: true },
        { playerId: 'b', side: 'B', isCaptain: true, isCoach: true },
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
      { playerId: 'a', side: 'A', isCaptain: true, isCoach: true },
      { playerId: 'b', side: 'B', isCaptain: true, isCoach: true },
    ])
  })

  it('includes unassigned pool players without side', () => {
    const entries = rosterEntriesFromSets(
      new Set(),
      new Set(),
      null,
      null,
      null,
      null,
      new Set(['p1', 'p2'])
    )
    expect(entries).toEqual([
      { playerId: 'p1', side: null, isCaptain: false, isCoach: false },
      { playerId: 'p2', side: null, isCaptain: false, isCoach: false },
    ])
  })
})

describe('updateMatchSchema players', () => {
  it('accepts friendly roster update with captains and coaches', () => {
    const result = updateMatchSchema.safeParse({
      players: [
        { playerId: 'fp-1', side: 'A', isCaptain: true, isCoach: true },
        { playerId: 'fp-2', side: 'B', isCaptain: true, isCoach: true },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts pool-only friendly roster without sides or captains', () => {
    const result = updateMatchSchema.safeParse({
      players: [{ playerId: 'fp-1' }, { playerId: 'fp-2', side: null }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects side assignment without captains', () => {
    const result = updateMatchSchema.safeParse({
      players: [
        { playerId: 'fp-1', side: 'A' },
        { playerId: 'fp-2', side: 'B' },
      ],
    })
    expect(result.success).toBe(false)
  })
})
