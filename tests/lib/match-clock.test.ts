import { describe, it, expect } from 'vitest'
import { getMatchMinute } from '@/lib/match-clock'
import { MatchStatus } from '@prisma/client'

const base = {
  clockStartedAt: null as Date | null,
  secondHalfStartedAt: null as Date | null,
  halftimeAt: null as Date | null,
}

describe('getMatchMinute', () => {
  it('returns 0 when scheduled', () => {
    expect(getMatchMinute({ ...base, status: MatchStatus.SCHEDULED }, new Date())).toBe(0)
  })

  it('counts first half minutes', () => {
    const now = new Date('2026-07-20T15:23:00Z')
    const started = new Date('2026-07-20T15:00:00Z')
    expect(
      getMatchMinute({ ...base, status: MatchStatus.LIVE, clockStartedAt: started }, now)
    ).toBe(23)
  })

  it('freezes at halftime', () => {
    const started = new Date('2026-07-20T15:00:00Z')
    const halftime = new Date('2026-07-20T15:45:00Z')
    const now = new Date('2026-07-20T16:00:00Z')
    expect(
      getMatchMinute(
        {
          ...base,
          status: MatchStatus.HALFTIME,
          clockStartedAt: started,
          halftimeAt: halftime,
        },
        now
      )
    ).toBe(45)
  })

  it('counts second half from 45', () => {
    const second = new Date('2026-07-20T16:00:00Z')
    const now = new Date('2026-07-20T16:12:00Z')
    expect(
      getMatchMinute(
        {
          ...base,
          status: MatchStatus.LIVE,
          clockStartedAt: new Date('2026-07-20T15:00:00Z'),
          secondHalfStartedAt: second,
        },
        now
      )
    ).toBe(57)
  })
})
