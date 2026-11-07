import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    organization: { findUniqueOrThrow: vi.fn() },
    team: { count: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { enforceCreateTeam } from '@/lib/billing/enforce'

describe('enforceCreateTeam', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 50-team error for League at cap', async () => {
    vi.mocked(db.organization.findUniqueOrThrow).mockResolvedValue({ plan: 'LEAGUE' })
    vi.mocked(db.team.count).mockResolvedValue(50)
    await expect(enforceCreateTeam('org-1')).resolves.toEqual({
      ok: false,
      error: 'El plan Liga permite hasta 50 equipos.',
    })
  })
})
