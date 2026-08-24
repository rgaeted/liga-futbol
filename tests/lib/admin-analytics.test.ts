import { describe, expect, it } from 'vitest'
import {
  applyMatchCap,
  paidRate,
  resolveAnalyticsPeriod,
  shouldShowBlock,
  weatherPeriodSummary,
} from '@/lib/admin-analytics'

describe('resolveAnalyticsPeriod', () => {
  const now = new Date('2026-08-24T16:00:00.000Z')

  it('defaults invalid period to 30', () => {
    const resolved = resolveAnalyticsPeriod('foo', now)
    expect(resolved.period).toBe('30')
    expect(resolved.from).not.toBeNull()
    expect(resolved.label).toBe('últimos 30 días')
  })

  it('returns null from for all', () => {
    const resolved = resolveAnalyticsPeriod('all', now)
    expect(resolved.period).toBe('all')
    expect(resolved.from).toBeNull()
    expect(resolved.label).toBe('todo el historial')
  })
})

describe('paidRate', () => {
  it('returns 75 for 3/4', () => {
    expect(paidRate(3, 4)).toBe(75)
  })

  it('returns null when total is 0', () => {
    expect(paidRate(0, 0)).toBeNull()
  })
})

describe('applyMatchCap', () => {
  it('keeps 200 most recent and flags truncated', () => {
    const matches = Array.from({ length: 201 }, (_, i) => ({ id: i }))
    const result = applyMatchCap(matches, 200)
    expect(result.rows).toHaveLength(200)
    expect(result.truncated).toBe(true)
  })
})

describe('shouldShowBlock', () => {
  it('hides empty rankings', () => {
    expect(shouldShowBlock([])).toBe(false)
    expect(shouldShowBlock([{ playerId: 'p1' }])).toBe(true)
  })
})

describe('weatherPeriodSummary', () => {
  it('returns null with fewer than 2 snapshots', () => {
    expect(weatherPeriodSummary([{ weatherTempC: 14, weatherLabel: 'Nublado' }])).toBeNull()
    expect(weatherPeriodSummary([])).toBeNull()
  })

  it('computes min max avg and top labels', () => {
    const summary = weatherPeriodSummary([
      { weatherTempC: 10, weatherLabel: 'Lluvia' },
      { weatherTempC: 20, weatherLabel: 'Despejado' },
      { weatherTempC: 12, weatherLabel: 'Lluvia' },
    ])
    expect(summary).toEqual({
      avgTempC: 14,
      minTempC: 10,
      maxTempC: 20,
      topLabels: ['Lluvia', 'Despejado'],
    })
  })
})
