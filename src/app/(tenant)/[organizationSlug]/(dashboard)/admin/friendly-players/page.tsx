import { redirect } from 'next/navigation'
import { orgPath } from '@/lib/tenant-paths'

export default async function AdminFriendlyPlayersPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  redirect(orgPath(organizationSlug, '/admin/players'))
}
