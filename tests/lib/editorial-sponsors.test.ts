import { describe, expect, it } from 'vitest'
import { isSponsorPubliclyVisible } from '@/lib/editorial/sponsors'

const now = new Date('2026-08-12T12:00:00.000Z')

describe('isSponsorPubliclyVisible', () => {
  it('hides inactive sponsors', () => {
    expect(
      isSponsorPubliclyVisible(
        { isActive: false, startsAt: null, endsAt: null },
        now,
      ),
    ).toBe(false)
  })

  it('hides future sponsors', () => {
    expect(
      isSponsorPubliclyVisible(
        {
          isActive: true,
          startsAt: new Date('2026-08-20T00:00:00.000Z'),
          endsAt: null,
        },
        now,
      ),
    ).toBe(false)
  })

  it('hides expired sponsors', () => {
    expect(
      isSponsorPubliclyVisible(
        {
          isActive: true,
          startsAt: null,
          endsAt: new Date('2026-08-10T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(false)
  })

  it('shows open-ended active sponsors', () => {
    expect(
      isSponsorPubliclyVisible({ isActive: true, startsAt: null, endsAt: null }, now),
    ).toBe(true)
  })

  it('shows currently active sponsors', () => {
    expect(
      isSponsorPubliclyVisible(
        {
          isActive: true,
          startsAt: new Date('2026-08-01T00:00:00.000Z'),
          endsAt: new Date('2026-08-20T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(true)
  })
})
