import { describe, expect, it } from 'vitest'
import {
  duplicateParticipationGroups,
  pickParticipationWinner,
  participationScore,
} from '@/lib/unified-roster-map'

describe('pickParticipationWinner', () => {
  it('prefers captain/paid rows', () => {
    const winner = pickParticipationWinner([
      { paid: false, isGalleta: true, isCaptain: false, isCoach: false },
      { paid: true, isGalleta: false, isCaptain: true, isCoach: false },
    ])
    expect(winner.isCaptain).toBe(true)
  })

  it('prefers coach over paid when captain ties', () => {
    const winner = pickParticipationWinner([
      { paid: true, isGalleta: false, isCaptain: false, isCoach: false },
      { paid: false, isGalleta: false, isCaptain: false, isCoach: true },
    ])
    expect(winner.isCoach).toBe(true)
  })
})

describe('participationScore', () => {
  it('ranks captain highest', () => {
    expect(
      participationScore({
        paid: true,
        isGalleta: true,
        isCaptain: true,
        isCoach: false,
      }),
    ).toBeGreaterThan(
      participationScore({
        paid: true,
        isGalleta: true,
        isCaptain: false,
        isCoach: true,
      }),
    )
  })
})

describe('duplicateParticipationGroups', () => {
  it('finds rows sharing matchId and playerId', () => {
    const rows = [
      { id: '1', matchId: 'm1', playerId: 'p1' },
      { id: '2', matchId: 'm1', playerId: 'p1' },
      { id: '3', matchId: 'm1', playerId: 'p2' },
    ]
    const dupes = duplicateParticipationGroups(rows)
    expect(dupes.size).toBe(1)
    expect(dupes.get('m1:p1')?.map((r) => r.id)).toEqual(['1', '2'])
  })
})
