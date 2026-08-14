'use client'

import { useParams } from 'next/navigation'
import { orgPath } from '@/lib/tenant-paths'

export function useOrganizationSlug(): string {
  const params = useParams()
  return params.organizationSlug as string
}

export function useOrgPath() {
  const slug = useOrganizationSlug()
  return (path: string) => orgPath(slug, path)
}
