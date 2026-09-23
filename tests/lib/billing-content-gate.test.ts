import { describe, expect, it } from 'vitest'
import { assertOrgCapability } from '@/lib/billing/capabilities'

describe('league content', () => {
  it('is League-only', () => {
    expect(assertOrgCapability('CLUB', 'MANAGE_LEAGUE_CONTENT').ok).toBe(false)
    expect(assertOrgCapability('LEAGUE', 'MANAGE_LEAGUE_CONTENT').ok).toBe(true)
  })
})
