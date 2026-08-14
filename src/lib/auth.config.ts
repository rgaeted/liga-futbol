import type { NextAuthConfig } from 'next-auth'
import type { MembershipRole } from '@/lib/membership-role'

export default {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isPlatformAdmin = user.isPlatformAdmin
        token.membershipRole = user.membershipRole
        token.activeOrganizationId = user.activeOrganizationId
        token.activeOrganizationSlug = user.activeOrganizationSlug
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isPlatformAdmin = token.isPlatformAdmin as boolean
        session.user.membershipRole = token.membershipRole as MembershipRole | null
        session.user.activeOrganizationId = token.activeOrganizationId as string | null
        session.user.activeOrganizationSlug = token.activeOrganizationSlug as string | null
      }
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
