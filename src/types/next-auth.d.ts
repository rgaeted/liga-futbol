import type { MembershipRole } from '@/lib/membership-role'
import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    isPlatformAdmin: boolean
    membershipRole: MembershipRole | null
    activeOrganizationId: string | null
    activeOrganizationSlug: string | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      isPlatformAdmin: boolean
      membershipRole: MembershipRole | null
      activeOrganizationId: string | null
      activeOrganizationSlug: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    isPlatformAdmin: boolean
    membershipRole: MembershipRole | null
    activeOrganizationId: string | null
    activeOrganizationSlug: string | null
  }
}
