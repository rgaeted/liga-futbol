import { editorialPublicUrl } from '@/lib/editorial/urls'
import type { OrganizationStatus } from '@prisma/client'

export function serializeOrganizationDirectoryItem(org: {
  id: string
  slug: string
  name: string
  logoStoragePath: string | null
  status: OrganizationStatus
}) {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    logoUrl: editorialPublicUrl(org.logoStoragePath),
  }
}
