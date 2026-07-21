import { describe, it, expect } from 'vitest'
import {
  assertPlayersBelongToCategory,
  friendlyMatchRequiresCategory,
} from '@/lib/friendly-category-guards'

describe('friendly category guards', () => {
  it('requires category id for friendly matches', () => {
    expect(friendlyMatchRequiresCategory(null)).toBe(false)
    expect(friendlyMatchRequiresCategory('cat-1')).toBe(true)
  })

  it('accepts players that all belong to the category', () => {
    const result = assertPlayersBelongToCategory('cat-1', [
      { id: 'p1', friendlyCategoryId: 'cat-1' },
      { id: 'p2', friendlyCategoryId: 'cat-1' },
    ])
    expect(result.ok).toBe(true)
  })

  it('rejects players from another category', () => {
    const result = assertPlayersBelongToCategory('cat-1', [
      { id: 'p1', friendlyCategoryId: 'cat-1' },
      { id: 'p2', friendlyCategoryId: 'cat-2' },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.foreignPlayerIds).toEqual(['p2'])
    }
  })
})
