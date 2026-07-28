import { describe, it, expect } from 'vitest'
import { EventType } from '@prisma/client'
import {
  DEFAULT_REFEREE_EVENT_TYPES,
  normalizeRefereeEventTypes,
  refereePanelEvents,
  resolveRefereeEventTypes,
  validateRefereeEventTypes,
} from '@/lib/match-referee-events'

describe('match-referee-events', () => {
  it('returns defaults when stored list is empty', () => {
    expect(resolveRefereeEventTypes([])).toEqual(DEFAULT_REFEREE_EVENT_TYPES)
    expect(resolveRefereeEventTypes(null)).toEqual(DEFAULT_REFEREE_EVENT_TYPES)
  })

  it('always keeps control events when normalizing', () => {
    const normalized = normalizeRefereeEventTypes([EventType.GOAL, EventType.YELLOW_CARD])
    expect(normalized).toContain(EventType.KICKOFF)
    expect(normalized).toContain(EventType.HALFTIME)
    expect(normalized).toContain(EventType.FULLTIME)
    expect(normalized).toContain(EventType.GOAL)
    expect(normalized).toContain(EventType.YELLOW_CARD)
  })

  it('requires at least one measurable event', () => {
    expect(validateRefereeEventTypes([EventType.KICKOFF, EventType.FULLTIME])).toMatch(
      /al menos un evento/
    )
    expect(validateRefereeEventTypes([EventType.GOAL])).toBeNull()
  })

  it('filters referee panel buttons by enabled types', () => {
    const panel = refereePanelEvents([EventType.GOAL, EventType.KICKOFF, EventType.FULLTIME])
    expect(panel.map((item) => item.type)).toEqual([
      EventType.KICKOFF,
      EventType.GOAL,
      EventType.HALFTIME,
      EventType.FULLTIME,
    ])
  })
})
