import { describe, expect, it } from 'vitest'
import { resolveBackfillCategoryId } from '@/lib/season-category-backfill'

describe('resolveBackfillCategoryId', () => {
  it('returns none when the org has zero categories', () => {
    expect(resolveBackfillCategoryId([])).toEqual({ kind: 'none' })
  })

  it('returns the only active category', () => {
    expect(resolveBackfillCategoryId(['cat-35'])).toEqual({
      kind: 'single',
      categoryId: 'cat-35',
    })
  })

  it('returns ambiguous when several exist', () => {
    expect(resolveBackfillCategoryId(['cat-35', 'cat-40'])).toEqual({ kind: 'ambiguous' })
  })
})
