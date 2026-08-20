import { describe, expect, it } from 'vitest'
import { validateFriendlyCaptains, captainsFromRoster } from '@/lib/friendly-match-captain'
import { validateFriendlyRoster } from '@/lib/friendly-match-roster'

describe('friendly roster playerId', () => {
  it('validates captains with playerId', () => {
    const roster = [
      { playerId: 'p1', side: 'A' as const, isCaptain: true },
      { playerId: 'p2', side: 'B' as const, isCaptain: true },
    ]
    expect(validateFriendlyCaptains(roster)).toBeNull()
    expect(captainsFromRoster(roster)).toEqual({
      sideACaptainId: 'p1',
      sideBCaptainId: 'p2',
    })
  })

  it('rejects duplicate playerId', () => {
    expect(
      validateFriendlyRoster([
        { playerId: 'p1', side: 'A', isCaptain: true, isCoach: true },
        { playerId: 'p1', side: 'B', isCaptain: true, isCoach: true },
      ]),
    ).toMatch(/dos veces/i)
  })
})
