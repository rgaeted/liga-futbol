import { describe, it, expect } from 'vitest'
import { grantPlayerAwardSchema } from '@/lib/validations/player-award'

describe('player award validation', () => {
  it('accepts grant with orgAwardId', () => {
    const result = grantPlayerAwardSchema.safeParse({
      orgAwardId: 'award_1',
    })
    expect(result.success).toBe(true)
  })

  it('accepts grant with seasonId and note', () => {
    const result = grantPlayerAwardSchema.safeParse({
      orgAwardId: 'award_1',
      seasonId: 'season_1',
      note: 'Copa Los Lagos 2026',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty orgAwardId', () => {
    const result = grantPlayerAwardSchema.safeParse({ orgAwardId: '' })
    expect(result.success).toBe(false)
  })
})
