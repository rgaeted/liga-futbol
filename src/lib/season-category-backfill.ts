export type BackfillCategoryResult =
  | { kind: 'none' }
  | { kind: 'single'; categoryId: string }
  | { kind: 'ambiguous' }

export function resolveBackfillCategoryId(activeCategoryIds: string[]): BackfillCategoryResult {
  if (activeCategoryIds.length === 0) return { kind: 'none' }
  if (activeCategoryIds.length === 1) {
    return { kind: 'single', categoryId: activeCategoryIds[0]! }
  }
  return { kind: 'ambiguous' }
}
