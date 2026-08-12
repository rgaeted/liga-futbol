import { describe, expect, it } from 'vitest'
import { validateSeasonEnrollment } from '@/lib/season-enrollment-validation'

describe('validateSeasonEnrollment', () => {
  it('rejects players assigned to two teams', () => {
    expect(
      validateSeasonEnrollment({
        teams: [
          { teamId: 't1', displayName: 'Rojo', playerIds: ['p1'] },
          { teamId: 't2', displayName: 'Azul', playerIds: ['p1'] },
        ],
      }),
    ).toBe('Un jugador no puede estar inscrito en dos equipos de la misma temporada')
  })
})
