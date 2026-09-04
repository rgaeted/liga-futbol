import { describe, expect, it } from 'vitest'
import { AWARD_EMOJI_OPTIONS, isAllowedAwardEmoji } from '@/lib/award-emoji-options'

describe('award emoji options', () => {
  it('lists curated emojis within validation limit', () => {
    for (const emoji of AWARD_EMOJI_OPTIONS) {
      expect(emoji.length).toBeGreaterThan(0)
      expect(emoji.length).toBeLessThanOrEqual(8)
    }
  })

  it('accepts curated emojis only', () => {
    expect(isAllowedAwardEmoji('🏆')).toBe(true)
    expect(isAllowedAwardEmoji('')).toBe(false)
    expect(isAllowedAwardEmoji('not-an-emoji')).toBe(false)
  })
})
