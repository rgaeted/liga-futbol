import { describe, expect, it } from 'vitest'
import { orgAccentForeground } from '@/lib/org-accent'

describe('orgAccentForeground', () => {
  it('uses night text on a light accent', () => {
    expect(orgAccentForeground('#E8E4D8')).toBe('#0B1210')
  })

  it('uses flood text on Kelme red', () => {
    expect(orgAccentForeground('#C91F26')).toBe('#E8E4D8')
  })

  it('uses flood text when the hex is invalid', () => {
    expect(orgAccentForeground('red')).toBe('#E8E4D8')
  })
})
