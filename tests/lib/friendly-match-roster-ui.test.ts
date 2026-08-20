import { describe, expect, it } from 'vitest'
import {
  applyInitialSplitForUnassigned,
  initialSideSplit,
  rosterEntriesFromSets,
  setPlayerSide,
  toggleConvocation,
} from '@/lib/friendly-match-roster-ui'

const players = [
  { id: 'p1', firstName: 'Ana', lastName: 'Zapata' },
  { id: 'p2', firstName: 'Bruno', lastName: 'Mora' },
  { id: 'p3', firstName: 'Carla', lastName: 'Nunez' },
  { id: 'p4', firstName: 'Diego', lastName: 'Perez' },
]

describe('initialSideSplit', () => {
  it('splits alphabetically half on A and half on B', () => {
    const map = initialSideSplit(players)
    // Orden: Mora, Nunez, Perez, Zapata → mitad en A, mitad en B
    expect(map.get('p2')).toBe('A')
    expect(map.get('p3')).toBe('A')
    expect(map.get('p4')).toBe('B')
    expect(map.get('p1')).toBe('B')
  })
})

describe('applyInitialSplitForUnassigned', () => {
  it('only assigns players without a side', () => {
    const result = applyInitialSplitForUnassigned(
      players,
      new Set(['p1']),
      new Set(['p2'])
    )
    expect(result.sideAIds.has('p1')).toBe(true)
    expect(result.sideBIds.has('p2')).toBe(true)
    expect(result.sideAIds.has('p3') || result.sideBIds.has('p3')).toBe(true)
    expect(result.sideAIds.has('p4') || result.sideBIds.has('p4')).toBe(true)
  })
})

describe('setPlayerSide', () => {
  it('moves player and clears captain when leaving side', () => {
    const result = setPlayerSide({
      playerId: 'p1',
      side: 'B',
      sideAIds: new Set(['p1']),
      sideBIds: new Set(['p2']),
      sideACaptainId: 'p1',
      sideBCaptainId: null,
      sideACoachId: null,
      sideBCoachId: null,
    })
    expect(result.sideAIds.has('p1')).toBe(false)
    expect(result.sideBIds.has('p1')).toBe(true)
    expect(result.sideACaptainId).toBeNull()
  })
})

describe('toggleConvocation', () => {
  it('removes side assignment when unconvoking', () => {
    const result = toggleConvocation({
      playerId: 'p1',
      checked: false,
      convokedIds: new Set(['p1', 'p2']),
      sideAIds: new Set(['p1']),
      sideBIds: new Set(['p2']),
      sideACaptainId: 'p1',
      sideBCaptainId: null,
      sideACoachId: null,
      sideBCoachId: null,
    })
    expect(result.convokedIds.has('p1')).toBe(false)
    expect(result.sideAIds.has('p1')).toBe(false)
    expect(result.sideACaptainId).toBeNull()
  })
})

describe('rosterEntriesFromSets', () => {
  it('builds API payload with captain and coach flags', () => {
    const entries = rosterEntriesFromSets(
      new Set(['p1']),
      new Set(['p2']),
      'p1',
      'p2',
      'p1',
      'p2'
    )
    expect(entries).toEqual([
      { playerId: 'p1', side: 'A', isCaptain: true, isCoach: true },
      { playerId: 'p2', side: 'B', isCaptain: true, isCoach: true },
    ])
  })
})
