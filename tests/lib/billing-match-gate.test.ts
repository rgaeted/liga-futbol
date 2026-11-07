import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assertOrgCapability } from '@/lib/billing/capabilities'

describe('match type vs plan', () => {
  it('blocks league matches on Club', () => {
    expect(assertOrgCapability('CLUB', 'MANAGE_LEAGUE_MATCHES').ok).toBe(false)
    expect(assertOrgCapability('CLUB', 'MANAGE_FRIENDLIES').ok).toBe(true)
  })

  it('allows both match types on League', () => {
    expect(assertOrgCapability('LEAGUE', 'MANAGE_LEAGUE_MATCHES').ok).toBe(true)
    expect(assertOrgCapability('LEAGUE', 'MANAGE_FRIENDLIES').ok).toBe(true)
  })

  it('blocks seasons on Club and Free', () => {
    expect(assertOrgCapability('CLUB', 'MANAGE_SEASONS').ok).toBe(false)
    expect(assertOrgCapability('FREE', 'MANAGE_SEASONS').ok).toBe(false)
    expect(assertOrgCapability('LEAGUE', 'MANAGE_SEASONS').ok).toBe(true)
  })
})

vi.mock('@/lib/db', () => ({
  db: { organization: { findUniqueOrThrow: vi.fn() } },
}))

import { db } from '@/lib/db'
import { enforceCreateMatch } from '@/lib/billing/enforce'

describe('enforceCreateMatch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a league match on a Club org', async () => {
    vi.mocked(db.organization.findUniqueOrThrow).mockResolvedValue({ plan: 'CLUB' })
    await expect(enforceCreateMatch('org-1', 'LEAGUE')).resolves.toMatchObject({ ok: false })
  })

  it('allows a friendly on a Club org', async () => {
    vi.mocked(db.organization.findUniqueOrThrow).mockResolvedValue({ plan: 'CLUB' })
    await expect(enforceCreateMatch('org-1', 'FRIENDLY')).resolves.toEqual({ ok: true })
  })
})
