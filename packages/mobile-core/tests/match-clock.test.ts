import { describe, expect, it } from 'vitest'
import { getMatchClock } from '../src/match-clock'

describe('getMatchClock', () => {
  it('freezes the first-half clock at halftime', () => {
    const clockStartedAt = new Date('2026-08-20T23:00:00.000Z')
    const halftimeAt = new Date('2026-08-20T23:45:00.000Z')
    const now = new Date('2026-08-20T23:50:00.000Z')

    expect(
      getMatchClock(
        {
          status: 'HALFTIME',
          clockStartedAt,
          secondHalfStartedAt: null,
          halftimeAt,
        },
        now,
      ),
    ).toMatchObject({ minute: 45, running: false })
  })
})
