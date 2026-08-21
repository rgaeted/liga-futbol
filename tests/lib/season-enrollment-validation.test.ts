import { describe, expect, it } from 'vitest'
import {
  validateSeasonEnrollment,
  validateEnrollmentPlayerCategories,
} from '@/lib/season-enrollment-validation'

describe('validateSeasonEnrollment', () => {
  it('rejects players assigned to two clubs in the same category payload', () => {
    expect(
      validateSeasonEnrollment({
        categoryId: 'cat-35',
        teams: [
          { teamId: 't1', displayName: 'Búfalos', playerIds: ['p1'] },
          { teamId: 't2', displayName: 'Cobre Sur', playerIds: ['p1'] },
        ],
      }),
    ).toBe('Un jugador no puede estar inscrito en dos clubes de la misma categoría')
  })
})

describe('validateEnrollmentPlayerCategories', () => {
  it('rejects a player without the category tag', () => {
    expect(validateEnrollmentPlayerCategories(['p1', 'p2'], new Set(['p1']))).toBe(
      'Ese jugador no está en la categoría seleccionada.',
    )
  })

  it('accepts players that all have the tag', () => {
    expect(validateEnrollmentPlayerCategories(['p1'], new Set(['p1', 'p2']))).toBeNull()
  })
})
