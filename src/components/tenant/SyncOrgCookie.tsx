'use client'

import { useEffect } from 'react'
import { syncOrgCookieAction } from '@/lib/sync-org-cookie-action'

export function SyncOrgCookie({ organizationId }: { organizationId: string }) {
  useEffect(() => {
    void syncOrgCookieAction(organizationId)
  }, [organizationId])

  return null
}
