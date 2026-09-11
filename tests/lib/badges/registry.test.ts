import { describe, expect, it } from 'vitest'
import { BADGE_REGISTRY, getBadgeDefinition } from '@/lib/badges/registry'

describe('BADGE_REGISTRY', () => {
  it('has 34 unique predicate ids', () => {
    const ids = BADGE_REGISTRY.map((row) => row.predicateId)
    expect(ids).toHaveLength(34)
    expect(new Set(ids).size).toBe(34)
  })

  it('marks unevaluable predicates', () => {
    expect(getBadgeDefinition('de_todos_los_sabores').evaluable).toBe(false)
    expect(getBadgeDefinition('salvador').evaluable).toBe(false)
    expect(getBadgeDefinition('sin_excusas').evaluable).toBe(false)
    expect(getBadgeDefinition('bombero').evaluable).toBe(false)
    expect(getBadgeDefinition('hat_trick').evaluable).toBe(true)
  })
})
