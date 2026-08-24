import { describe, expect, it } from 'vitest'
import {
  organizationSlugFromPath,
  resolvePostLoginDestination,
  resolvePostLoginPath,
} from '@/lib/post-login-redirect'
import { MembershipRole } from '@/lib/membership-role'

describe('resolvePostLoginPath', () => {
  it('sends platform admin without memberships to /plataforma', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: true,
        memberships: [],
      }),
    ).toBe('/plataforma')
  })

  it('sends a user with one active membership to their dashboard', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: false,
        memberships: [{ slug: 'kelme', roles: [MembershipRole.COACH], status: 'ACTIVE' }],
      }),
    ).toBe('/kelme/coach')
  })

  it('sends a user with several memberships to the picker', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: false,
        memberships: [
          { slug: 'kelme', roles: [MembershipRole.ORG_ADMIN], status: 'ACTIVE' },
          { slug: 'otra', roles: [MembershipRole.REFEREE], status: 'ACTIVE' },
        ],
      }),
    ).toBe('/organizaciones')
  })

  it('ignores paused orgs when counting memberships', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: false,
        memberships: [{ slug: 'kelme', roles: [MembershipRole.ORG_ADMIN], status: 'PAUSED' }],
      }),
    ).toBe('/login?error=sin-acceso')
  })

  it('honors a safe tenant callback url', () => {
    expect(
      resolvePostLoginDestination({
        isPlatformAdmin: false,
        memberships: [{ slug: 'kelme', roles: [MembershipRole.ORG_ADMIN], status: 'ACTIVE' }],
        callbackUrl: '/kelme/admin/challenges',
      }),
    ).toBe('/kelme/admin/challenges')
  })

  it('extracts organization slug from tenant paths', () => {
    expect(organizationSlugFromPath('/kelme/admin/matches')).toBe('kelme')
  })

  it('does not treat reserved first segments as organization slugs', () => {
    expect(organizationSlugFromPath('/api/admin/dashboard')).toBeNull()
    expect(organizationSlugFromPath('/plataforma')).toBeNull()
    expect(organizationSlugFromPath('/organizaciones')).toBeNull()
    expect(organizationSlugFromPath('/login')).toBeNull()
  })
})
