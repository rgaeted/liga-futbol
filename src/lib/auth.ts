import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import authConfig from '@/lib/auth.config'
import type { MembershipRole } from '@/lib/membership-role'
import { hasAnyMembershipRole, primaryMembershipRole } from '@/lib/membership-role'
import { assertSameOrganization } from '@/lib/org-scope'
import { ORG_COOKIE, clearOrgCookieOptions } from '@/lib/org-cookie'

export { assertSameOrganization, pausedOrganizationPayload } from '@/lib/org-scope'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            memberships: {
              include: {
                organization: {
                  select: { id: true, slug: true, status: true },
                },
              },
            },
          },
        })
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        const activeMemberships = user.memberships.filter(
          (m) => m.organization.status === 'ACTIVE'
        )
        const singleMembership =
          activeMemberships.length === 1 ? activeMemberships[0] : null
        const roles = (singleMembership?.roles ?? []) as MembershipRole[]

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isPlatformAdmin: user.isPlatformAdmin,
          membershipRoles: roles,
          membershipRole: roles.length > 0 ? primaryMembershipRole(roles) : null,
          activeOrganizationId: singleMembership?.organization.id ?? null,
          activeOrganizationSlug: singleMembership?.organization.slug ?? null,
        }
      },
    }),
  ],
})

export async function requirePlatformAdmin() {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) throw new Error('Unauthorized')
  return session
}

export async function requireOrgRole(allowed: MembershipRole[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const cookieStore = await cookies()
  const orgIdFromCookie = cookieStore.get(ORG_COOKIE)?.value

  if (orgIdFromCookie) {
    const membership = await db.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgIdFromCookie,
          userId: session.user.id,
        },
      },
    })
    if (membership && hasAnyMembershipRole(membership.roles, allowed)) {
      return {
        session,
        organizationId: orgIdFromCookie,
        roles: membership.roles,
        role: primaryMembershipRole(membership.roles),
      }
    }
  }

  const roles = session.user.membershipRoles
  const orgId = session.user.activeOrganizationId
  if (!orgId || roles.length === 0 || !hasAnyMembershipRole(roles, allowed)) {
    throw new Error('Unauthorized')
  }
  return {
    session,
    organizationId: orgId,
    roles,
    role: primaryMembershipRole(roles),
  }
}

/** Resuelve permisos contra la organización del partido (no la cookie activa). */
export async function requireMatchOrgRole(matchId: string, allowed: MembershipRole[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const match = await db.match.findUniqueOrThrow({ where: { id: matchId } })
  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: match.organizationId,
        userId: session.user.id,
      },
    },
  })

  if (!membership || !hasAnyMembershipRole(membership.roles, allowed)) {
    throw new Error('Unauthorized')
  }

  return {
    session,
    organizationId: match.organizationId,
    roles: membership.roles,
    role: primaryMembershipRole(membership.roles),
    match,
  }
}

export async function signOutAndClearOrg(redirectTo = '/login') {
  const cookieStore = await cookies()
  cookieStore.set(clearOrgCookieOptions())
  await signOut({ redirectTo })
}

/** @deprecated Use requireOrgRole instead */
export async function requireRole(_allowedRoles: string[]) {
  throw new Error('requireRole is deprecated; use requireOrgRole')
}
