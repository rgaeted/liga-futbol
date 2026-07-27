import { describe, it, expect } from 'vitest'
import { validateFriendlyCoaches, coachesFromRoster } from '@/lib/friendly-match-coach'

describe('validateFriendlyCoaches', () => {
  it('requires exactly one coach per side', () => {
    expect(
      validateFriendlyCoaches([
        { friendlyPlayerId: 'a', side: 'A', isCoach: true },
        { friendlyPlayerId: 'b', side: 'B' },
      ])
    ).toBe('Debes elegir un DT para el equipo visitante (lado B)')
  })

  it('accepts one coach per side', () => {
    expect(
      validateFriendlyCoaches([
        { friendlyPlayerId: 'a', side: 'A', isCoach: true },
        { friendlyPlayerId: 'b', side: 'B', isCoach: true },
      ])
    ).toBeNull()
  })
})

describe('coachesFromRoster', () => {
  it('extracts coach ids by side', () => {
    expect(
      coachesFromRoster([
        { friendlyPlayerId: 'a', side: 'A', isCoach: true },
        { friendlyPlayerId: 'b', side: 'B', isCoach: true },
      ])
    ).toEqual({ sideACoachId: 'a', sideBCoachId: 'b' })
  })
})
