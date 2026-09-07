import { describe, expect, it } from 'vitest'
import { canShowFriendlyMatchLiveLink } from '@/lib/friendly-match-page'

describe('canShowFriendlyMatchLiveLink', () => {
  it('shows live link after the match starts', () => {
    expect(canShowFriendlyMatchLiveLink('SCHEDULED')).toBe(false)
    expect(canShowFriendlyMatchLiveLink('LIVE')).toBe(true)
    expect(canShowFriendlyMatchLiveLink('HALFTIME')).toBe(true)
    expect(canShowFriendlyMatchLiveLink('FINISHED')).toBe(true)
    expect(canShowFriendlyMatchLiveLink('CANCELLED')).toBe(false)
  })
})
