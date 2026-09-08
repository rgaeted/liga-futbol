'use client'

import { useMemo } from 'react'
import { useOrgLandingRefresh } from '@/hooks/useOrgLandingRefresh'
import type { OrgPublicLanding } from '@/lib/org-public-landing'

export function OrgPublicLandingRefresh({
  data,
  children,
}: {
  data: OrgPublicLanding
  children: React.ReactNode
}) {
  const matchIds = useMemo(() => {
    const ids = new Set<string>()
    if (data.featured) ids.add(data.featured.id)
    for (const match of data.live) ids.add(match.id)
    return [...ids]
  }, [data.featured?.id, data.live])

  const hasLiveMatch =
    data.live.length > 0 ||
    data.featured?.status === 'LIVE' ||
    data.featured?.status === 'HALFTIME'

  useOrgLandingRefresh({ matchIds, hasLiveMatch })

  return children
}
