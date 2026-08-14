import type { NextAuthConfig } from 'next-auth'

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
        session.user.membershipRole = token.membershipRole
        session.user.activeOrganizationId = token.activeOrganizationId
        session.user.activeOrganizationSlug = token.activeOrganizationSlug
      }
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
