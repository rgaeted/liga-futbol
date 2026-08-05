import { describe, expect, it } from 'vitest'
import {
  assistCandidates,
  playersForTeamSide,
  resolveAssistFilter,
  sideFromScorer,
} from '@/lib/match-timeline-roster'

const friendlyPlayers = [
  { id: 'a1', label: 'Ana A', side: 'A' as const },
  { id: 'a2', label: 'Bruno A', side: 'A' as const },
  { id: 'b1', label: 'Carla B', side: 'B' as const },
  { id: 'b2', label: 'Diego B', side: 'B' as const },
]

describe('playersForTeamSide', () => {
  it('filters friendly players by side', () => {
    expect(playersForTeamSide('FRIENDLY', friendlyPlayers, { teamId: '', side: 'B' })).toEqual([
      friendlyPlayers[2],
      friendlyPlayers[3],
    ])
  })
})

describe('resolveAssistFilter', () => {
  it('uses scorer side for friendly goals even if form side differs', () => {
    expect(
      resolveAssistFilter('FRIENDLY', friendlyPlayers, {
        teamId: '',
        side: 'A',
        scorerId: 'b1',
      })
    ).toEqual({ teamId: '', side: 'B' })
  })
})

describe('assistCandidates', () => {
  it('lists teammates of the scorer, not the default form side', () => {
    const candidates = assistCandidates('FRIENDLY', friendlyPlayers, {
      teamId: '',
      side: 'A',
      scorerId: 'b1',
    })
    expect(candidates.map((p) => p.id)).toEqual(['b2'])
  })

  it('excludes the scorer from assist options', () => {
    const candidates = assistCandidates('FRIENDLY', friendlyPlayers, {
      teamId: '',
      side: 'A',
      scorerId: 'a1',
    })
    expect(candidates.map((p) => p.id)).toEqual(['a2'])
  })
})

describe('sideFromScorer', () => {
  it('returns side B when scorer belongs to team B', () => {
    expect(sideFromScorer('FRIENDLY', friendlyPlayers, 'b2')).toEqual({ side: 'B' })
  })
})
