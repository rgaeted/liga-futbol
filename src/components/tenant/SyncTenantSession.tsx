'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import type { MembershipRole } from '@/lib/membership-role'

type Props = {
  organizationId: string
  organizationSlug: string
  role: MembershipRole
}

function tenantSessionKey(organizationId: string, organizationSlug: string, role: MembershipRole) {
  return `${organizationId}:${organizationSlug}:${role}`
}

function sessionMatchesTenant(
  session: {
    activeOrganizationSlug?: string | null
    activeOrganizationId?: string | null
    membershipRole?: MembershipRole | null
  },
  organizationId: string,
  organizationSlug: string,
  role: MembershipRole,
) {
  return (
    session.activeOrganizationSlug === organizationSlug &&
    session.activeOrganizationId === organizationId &&
    session.membershipRole === role
  )
}

/** Alinea cookie + JWT con la empresa de la URL (multi-org), sin loops de update(). */
export function SyncTenantSession({ organizationId, organizationSlug, role }: Props) {
  const { data: session, update, status } = useSession()
  const syncedKeyRef = useRef<string | null>(null)
  const syncingRef = useRef(false)

  const activeOrganizationId = session?.user.activeOrganizationId
  const activeOrganizationSlug = session?.user.activeOrganizationSlug
  const membershipRole = session?.user.membershipRole

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return

    const targetKey = tenantSessionKey(organizationId, organizationSlug, role)
    if (syncedKeyRef.current === targetKey) return
    if (syncingRef.current) return

    if (
      sessionMatchesTenant(
        {
          activeOrganizationId,
          activeOrganizationSlug,
          membershipRole,
        },
        organizationId,
        organizationSlug,
        role,
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
          membershipRole: role,
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
    role,
    activeOrganizationId,
    activeOrganizationSlug,
    membershipRole,
    session?.user,
    status,
    update,
  ])

  return null
}
