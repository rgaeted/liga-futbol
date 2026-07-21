import { describe, it, expect } from 'vitest'
import { sortTimelineEvents, timelineUsesCreatedAtOrder } from '@/lib/match-timeline-sort'

describe('sortTimelineEvents', () => {
  const t1 = new Date('2026-07-20T15:00:00Z')
  const t2 = new Date('2026-07-20T15:10:00Z')
  const t3 = new Date('2026-07-20T15:20:00Z')

  it('sorts by minute then createdAt for clocked matches', () => {
    const sorted = sortTimelineEvents(
      [
        { id: 'b', minute: 45, createdAt: t2 },
        { id: 'a', minute: 0, createdAt: t1 },
        { id: 'c', minute: 45, createdAt: t3 },
      ],
      { preferCreatedAt: false }
    )
    expect(sorted.map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('sorts by createdAt for legacy matches with bad minutes', () => {
    const sorted = sortTimelineEvents(
      [
        { id: 'goal-late', minute: 90, createdAt: t2 },
        { id: 'kickoff', minute: 0, createdAt: t1 },
        { id: 'goal-early', minute: 0, createdAt: t3 },
      ],
      { preferCreatedAt: true }
    )
    expect(sorted.map((e) => e.id)).toEqual(['kickoff', 'goal-late', 'goal-early'])
  })
})

describe('timelineUsesCreatedAtOrder', () => {
  it('is true without clockStartedAt', () => {
    expect(timelineUsesCreatedAtOrder(null)).toBe(true)
  })

  it('is false with clockStartedAt', () => {
    expect(timelineUsesCreatedAtOrder(new Date())).toBe(false)
  })
})
