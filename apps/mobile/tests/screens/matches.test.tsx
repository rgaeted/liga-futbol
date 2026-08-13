import { describe, expect, it } from 'vitest'
import { groupMatchesByDate } from '../../src/lib/format'

describe('groupMatchesByDate', () => {
  it('groups fixtures by America/Santiago even when UTC crosses midnight', () => {
    const groups = groupMatchesByDate([
      {
        scheduledAt: '2026-08-21T15:00:00.000Z',
      },
      {
        scheduledAt: '2026-08-22T02:00:00.000Z',
      },
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.items).toHaveLength(2)
  })
})
