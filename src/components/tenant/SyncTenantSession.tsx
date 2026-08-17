'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import type { MembershipRole } from '@/lib/membership-role'

type Props = {
  organizationId: string
  organizationSlug: string
  role: MembershipRole
}

/** Alinea la sesión JWT con la empresa de la URL (multi-org). */
export function SyncTenantSession({ organizationId, organizationSlug, role }: Props) {
  const { data: session, update, status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (
      session.user.activeOrganizationSlug === organizationSlug &&
      session.user.membershipRole === role &&
      session.user.activeOrganizationId === organizationId
    ) {
      return
    }

    void update({
      membershipRole: role,
      activeOrganizationId: organizationId,
      activeOrganizationSlug: organizationSlug,
    })
  }, [
    organizationId,
    organizationSlug,
    role,
    session?.user.activeOrganizationId,
    session?.user.activeOrganizationSlug,
    session?.user.membershipRole,
    status,
    update,
  ])

  return null
}
