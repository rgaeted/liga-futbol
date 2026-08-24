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

  it('sends platform admin with memberships to /plataforma', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: true,
        memberships: [{ slug: 'kelme', roles: [MembershipRole.ORG_ADMIN], status: 'ACTIVE' }],
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

  it('prefers the org with more friendly participations when tied memberships differ', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: false,
        memberships: [
          { slug: 'kelme', roles: [MembershipRole.FRIENDLY_COACH], status: 'ACTIVE' },
          { slug: 'loslunes', roles: [MembershipRole.PLAYER], status: 'ACTIVE' },
        ],
        friendlyParticipationsBySlug: { kelme: 0, loslunes: 5 },
      }),
    ).toBe('/loslunes/player')
  })

  it('falls back to the picker when activity is tied across orgs', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: false,
        memberships: [
          { slug: 'kelme', roles: [MembershipRole.PLAYER], status: 'ACTIVE' },
          { slug: 'loslunes', roles: [MembershipRole.PLAYER], status: 'ACTIVE' },
        ],
        friendlyParticipationsBySlug: { kelme: 2, loslunes: 2 },
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

  it('redirects org landing callback to dashboard instead of the public vitrine', () => {
    expect(
      resolvePostLoginDestination({
        isPlatformAdmin: false,
        memberships: [{ slug: 'loslunes', roles: [MembershipRole.ORG_ADMIN], status: 'ACTIVE' }],
        callbackUrl: '/loslunes',
      }),
    ).toBe('/loslunes/admin')
  })

  it('sends platform admin from org landing callback to that org admin', () => {
    expect(
      resolvePostLoginDestination({
        isPlatformAdmin: true,
        memberships: [],
        callbackUrl: '/loslunes',
      }),
    ).toBe('/loslunes/admin')
  })

  it('falls back when org landing callback is for an org without access', () => {
    expect(
      resolvePostLoginDestination({
        isPlatformAdmin: false,
        memberships: [{ slug: 'kelme', roles: [MembershipRole.COACH], status: 'ACTIVE' }],
        callbackUrl: '/loslunes',
      }),
    ).toBe('/kelme/coach')
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
