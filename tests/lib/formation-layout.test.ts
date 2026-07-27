import { describe, it, expect } from 'vitest'
import { GK_BOTTOM_PERCENT, slotTopPercent } from '@/lib/formation-layout'

describe('slotTopPercent', () => {
  it('places GK inside the bottom goal area in live view', () => {
    expect(slotTopPercent(0, 3, 'live', true)).toBe(GK_BOTTOM_PERCENT)
    expect(slotTopPercent(0, 3, 'live', true)).toBeGreaterThan(85)
  })

  it('places GK inside the bottom goal area in editor view', () => {
    expect(slotTopPercent(0, 3, 'editor', true)).toBe(GK_BOTTOM_PERCENT)
    expect(slotTopPercent(0, 3, 'editor', true)).toBeGreaterThan(85)
  })

  it('stacks outfield rows upward from GK in live view', () => {
    const gk = slotTopPercent(0, 3, 'live', true)
    const row1 = slotTopPercent(1, 3, 'live', true)
    const row3 = slotTopPercent(3, 3, 'live', true)
    expect(row1).toBeLessThan(gk)
    expect(row3).toBeLessThan(row1)
  })
})
