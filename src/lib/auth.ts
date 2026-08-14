import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import authConfig from '@/lib/auth.config'
import type { MembershipRole } from '@/lib/membership-role'
import { assertSameOrganization } from '@/lib/org-scope'

export { assertSameOrganization }

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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isPlatformAdmin: user.isPlatformAdmin,
          membershipRole: (singleMembership?.role ?? null) as MembershipRole | null,
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
  const role = session?.user?.membershipRole
  const orgId = session?.user?.activeOrganizationId
  if (!session || !role || !orgId || !allowed.includes(role)) {
    throw new Error('Unauthorized')
  }
  return { session, organizationId: orgId, role }
}

/** @deprecated Use requireOrgRole instead */
export async function requireRole(_allowedRoles: string[]) {
  throw new Error('requireRole is deprecated; use requireOrgRole')
}
