import { describe, it, expect } from 'vitest'
import {
  assertPlayersBelongToCategory,
  friendlyMatchRequiresCategory,
  playerBelongsToCategory,
} from '@/lib/friendly-category-guards'

describe('friendly category guards', () => {
  it('requires category id for friendly matches', () => {
    expect(friendlyMatchRequiresCategory(null)).toBe(false)
    expect(friendlyMatchRequiresCategory('cat-1')).toBe(true)
  })

  it('accepts players that all belong to the category', () => {
    const result = assertPlayersBelongToCategory('cat-1', [
      { id: 'p1', categoryIds: ['cat-1'] },
      { id: 'p2', categoryIds: ['cat-1', 'cat-2'] },
    ])
    expect(result.ok).toBe(true)
  })

  it('rejects players from another category', () => {
    const result = assertPlayersBelongToCategory('cat-1', [
      { id: 'p1', categoryIds: ['cat-1'] },
      { id: 'p2', categoryIds: ['cat-2'] },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.foreignPlayerIds).toEqual(['p2'])
    }
  })

  it('checks membership helper', () => {
    expect(playerBelongsToCategory(['cat-1', 'cat-2'], 'cat-2')).toBe(true)
    expect(playerBelongsToCategory(['cat-2'], 'cat-1')).toBe(false)
  })
})
