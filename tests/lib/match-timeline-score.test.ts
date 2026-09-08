import { EventType, MatchType } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { buildTimelineScoresAfter } from '@/lib/match-timeline-score'

describe('buildTimelineScoresAfter', () => {
  it('tracks running score for friendly goals in order', () => {
    const scores = buildTimelineScoresAfter(MatchType.FRIENDLY, null, null, [
      { id: '1', type: EventType.GOAL, side: 'A' },
      { id: '2', type: EventType.GOAL, side: 'B' },
      { id: '3', type: EventType.PENALTY_GOAL, side: 'A' },
    ])
    expect(scores.get('1')).toBe('1-0')
    expect(scores.get('2')).toBe('1-1')
    expect(scores.get('3')).toBe('2-1')
  })

  it('counts own goals against the scoring side', () => {
    const scores = buildTimelineScoresAfter(MatchType.FRIENDLY, null, null, [
      { id: '1', type: EventType.OWN_GOAL, side: 'A' },
    ])
    expect(scores.get('1')).toBe('0-1')
  })

  it('ignores non-scoring events', () => {
    const scores = buildTimelineScoresAfter(MatchType.FRIENDLY, null, null, [
      { id: '1', type: EventType.YELLOW_CARD, side: 'A' },
      { id: '2', type: EventType.GOAL, side: 'B' },
    ])
    expect(scores.has('1')).toBe(false)
    expect(scores.get('2')).toBe('0-1')
  })

  it('tracks league goals by team id', () => {
    const scores = buildTimelineScoresAfter(MatchType.LEAGUE, 'home', 'away', [
      { id: '1', type: EventType.GOAL, teamId: 'home' },
      { id: '2', type: EventType.GOAL, teamId: 'away' },
      { id: '3', type: EventType.GOAL, teamId: 'home' },
    ])
    expect(scores.get('1')).toBe('1-0')
    expect(scores.get('2')).toBe('1-1')
    expect(scores.get('3')).toBe('2-1')
  })
})
