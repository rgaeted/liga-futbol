import { describe, it, expect } from 'vitest'
import { GK_EDITOR_BOTTOM_PERCENT, GK_LIVE_TOP_PERCENT, slotTopPercent } from '@/lib/formation-layout'

describe('slotTopPercent', () => {
  it('places live GK inside the top goal area', () => {
    expect(slotTopPercent(0, 3, 'live', true)).toBe(GK_LIVE_TOP_PERCENT)
    expect(slotTopPercent(0, 3, 'live', true)).toBeLessThan(15)
  })

  it('places editor GK inside the bottom goal area', () => {
    expect(slotTopPercent(0, 3, 'editor', true)).toBe(GK_EDITOR_BOTTOM_PERCENT)
    expect(slotTopPercent(0, 3, 'editor', true)).toBeGreaterThan(85)
  })

  it('spreads outfield rows between defense and attack in live view', () => {
    const row1 = slotTopPercent(1, 3, 'live', true)
    const row3 = slotTopPercent(3, 3, 'live', true)
    expect(row1).toBeGreaterThan(GK_LIVE_TOP_PERCENT)
    expect(row3).toBeGreaterThan(row1)
  })
})
