'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import type { MembershipRole } from '@/lib/membership-role'
import { primaryMembershipRole } from '@/lib/membership-role'

type Props = {
  organizationId: string
  organizationSlug: string
  roles: MembershipRole[]
}

function tenantSessionKey(organizationId: string, organizationSlug: string, roles: MembershipRole[]) {
  return `${organizationId}:${organizationSlug}:${roles.join(',')}`
}

function sessionMatchesTenant(
  session: {
    activeOrganizationSlug?: string | null
    activeOrganizationId?: string | null
    membershipRoles?: MembershipRole[]
  },
  organizationId: string,
  organizationSlug: string,
  roles: MembershipRole[],
) {
  const sessionRoles = session.membershipRoles ?? []
  return (
    session.activeOrganizationSlug === organizationSlug &&
    session.activeOrganizationId === organizationId &&
    roles.length === sessionRoles.length &&
    roles.every((role) => sessionRoles.includes(role))
  )
}

/** Alinea cookie + JWT con la empresa de la URL (multi-org), sin loops de update(). */
export function SyncTenantSession({ organizationId, organizationSlug, roles }: Props) {
  const { data: session, update, status } = useSession()
  const syncedKeyRef = useRef<string | null>(null)
  const syncingRef = useRef(false)

  const activeOrganizationId = session?.user.activeOrganizationId
  const activeOrganizationSlug = session?.user.activeOrganizationSlug
  const membershipRoles = session?.user.membershipRoles

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return

    const targetKey = tenantSessionKey(organizationId, organizationSlug, roles)
    if (syncedKeyRef.current === targetKey) return
    if (syncingRef.current) return

    if (
      sessionMatchesTenant(
        {
          activeOrganizationId,
          activeOrganizationSlug,
          membershipRoles,
        },
        organizationId,
        organizationSlug,
        roles,
      )
    ) {
      syncedKeyRef.current = targetKey
      return
    }

    syncingRef.current = true

    void (async () => {
      try {
        const res = await fetch('/api/me/organization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId }),
        })
        if (!res.ok) return

        await update({
          membershipRoles: roles,
          membershipRole: primaryMembershipRole(roles),
          activeOrganizationId: organizationId,
          activeOrganizationSlug: organizationSlug,
        })
      } finally {
        syncedKeyRef.current = targetKey
        syncingRef.current = false
      }
    })()
  }, [
    organizationId,
    organizationSlug,
    roles,
    activeOrganizationId,
    activeOrganizationSlug,
    membershipRoles,
    session?.user,
    status,
    update,
  ])

  return null
}
