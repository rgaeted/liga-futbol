import { describe, expect, it } from 'vitest'
import { updateMatchSchema } from '@/lib/validations/match'

describe('updateMatchSchema colors and location', () => {
  it('accepts friendly side colors', () => {
    const result = updateMatchSchema.safeParse({
      sideAColor: '#CD212A',
      sideBColor: '#2563EB',
    })
    expect(result.success).toBe(true)
  })

  it('rejects partial location (region without commune)', () => {
    const result = updateMatchSchema.safeParse({
      regionCode: '13',
      communeCode: null,
    })
    expect(result.success).toBe(false)
  })

  it('treats empty refereeEventTypes array as omitted', () => {
    const result = updateMatchSchema.safeParse({
      refereeEventTypes: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.refereeEventTypes).toBeUndefined()
    }
  })
})
