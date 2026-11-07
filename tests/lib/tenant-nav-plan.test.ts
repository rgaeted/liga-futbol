import { describe, expect, it } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'
import { buildTenantNavGroups, type TenantNavContext } from '@/lib/tenant-nav'

const adminCtx = (plan: TenantNavContext['plan']): TenantNavContext => ({
  roles: [MembershipRole.ORG_ADMIN],
  hasPlayerProfile: false,
  hasFriendlyCoachParticipations: false,
  userAvatarUrl: null,
  plan,
})

function hrefs(plan: TenantNavContext['plan']) {
  return buildTenantNavGroups('acme', adminCtx(plan))
    .flatMap((g) => g.items)
    .map((i) => i.href)
}

describe('admin nav by plan', () => {
  it('hides seasons and content on Club', () => {
    const links = hrefs('CLUB')
    expect(links.some((h) => h.includes('/admin/seasons'))).toBe(false)
    expect(links.some((h) => h.includes('/admin/content'))).toBe(false)
    expect(links.some((h) => h.includes('/admin/teams'))).toBe(true)
    expect(links.some((h) => h.includes('/admin/matches'))).toBe(true)
  })

  it('shows seasons and content on League', () => {
    const links = hrefs('LEAGUE')
    expect(links.some((h) => h.includes('/admin/seasons'))).toBe(true)
    expect(links.some((h) => h.includes('/admin/content'))).toBe(true)
  })

  it('keeps player nav on Free', () => {
    const groups = buildTenantNavGroups('acme', {
      roles: [MembershipRole.PLAYER],
      hasPlayerProfile: true,
      hasFriendlyCoachParticipations: false,
      userAvatarUrl: null,
      plan: 'FREE',
    })
    expect(groups.some((g) => g.label === 'Jugador')).toBe(true)
    expect(groups.some((g) => g.label === 'Administración')).toBe(false)
  })
})
