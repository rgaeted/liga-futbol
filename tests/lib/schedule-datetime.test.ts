import { describe, it, expect } from 'vitest'
import {
  formatScheduleDateInput,
  formatScheduleDateLabel,
  formatScheduleTimeInput,
  formatScheduleTimeLabel,
  scheduleInputToIso,
} from '@/lib/schedule-datetime'

describe('schedule-datetime', () => {
  it('formats and parses Chile local time without drift', () => {
    const stored = new Date('2026-07-21T00:00:00.000Z')
    const date = formatScheduleDateInput(stored)
    const time = formatScheduleTimeInput(stored)
    expect(scheduleInputToIso(date, time)).toBe(stored.toISOString())
  })

  it('does not use UTC slices for evening matches in Chile', () => {
    const stored = new Date('2026-07-21T23:30:00.000Z')
    const date = formatScheduleDateInput(stored)
    const time = formatScheduleTimeInput(stored)

    expect(date).toBe('2026-07-21')
    expect(time).toBe('19:30')
    expect(scheduleInputToIso(date, time)).toBe(stored.toISOString())
  })

  it('labels evening Chile matches without UTC midnight drift', () => {
    // 20:30 Chile (UTC-4 invierno) = 00:30 UTC del día siguiente
    const stored = new Date('2026-07-22T00:30:00.000Z')
    expect(formatScheduleDateLabel(stored)).toMatch(/21-07-2026/)
    expect(formatScheduleTimeLabel(stored)).toBe('20:30')
  })
})
