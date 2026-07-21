import { describe, it, expect } from 'vitest'
import {
  createFriendlyCategorySchema,
  updateFriendlyCategorySchema,
} from '@/lib/validations/friendly-category'

describe('friendly category validation', () => {
  it('accepts create with name', () => {
    const result = createFriendlyCategorySchema.safeParse({
      name: 'Viernes fútbol',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createFriendlyCategorySchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts update with isActive', () => {
    const result = updateFriendlyCategorySchema.safeParse({
      name: 'Sábados',
      isActive: false,
    })
    expect(result.success).toBe(true)
  })
})
