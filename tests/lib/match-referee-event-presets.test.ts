import { describe, it, expect } from 'vitest'
import { EventType } from '@prisma/client'
import {
  BASIC_REFEREE_EVENT_TYPES,
  detectRefereeEventPreset,
  refereeEventTypesForPreset,
} from '@/lib/match-referee-event-presets'
import { normalizeRefereeEventTypes } from '@/lib/match-referee-events'

describe('match-referee-event-presets', () => {
  it('basico includes control, goals and cards only', () => {
    expect(BASIC_REFEREE_EVENT_TYPES).toContain(EventType.KICKOFF)
    expect(BASIC_REFEREE_EVENT_TYPES).toContain(EventType.GOAL)
    expect(BASIC_REFEREE_EVENT_TYPES).toContain(EventType.YELLOW_CARD)
    expect(BASIC_REFEREE_EVENT_TYPES).toContain(EventType.RED_CARD)
    expect(BASIC_REFEREE_EVENT_TYPES).not.toContain(EventType.FOUL)
  })

  it('completo matches default measurable set', () => {
    const completo = refereeEventTypesForPreset('completo')
    expect(completo).toContain(EventType.SHOT_ON_TARGET)
    expect(completo).toContain(EventType.SUBSTITUTION)
  })

  it('detects preset from event types', () => {
    expect(detectRefereeEventPreset(refereeEventTypesForPreset('basico'))).toBe('basico')
    expect(detectRefereeEventPreset(refereeEventTypesForPreset('completo'))).toBe('completo')
    expect(
      detectRefereeEventPreset(
        normalizeRefereeEventTypes([EventType.GOAL, EventType.FOUL])
      )
    ).toBe('personalizado')
  })
})
