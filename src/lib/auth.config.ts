import type { NextAuthConfig } from 'next-auth'

export default {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as typeof session.user.role
        session.user.id = token.id as string
      }
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
