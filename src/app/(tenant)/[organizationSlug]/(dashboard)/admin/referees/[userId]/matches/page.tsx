import { notFound } from 'next/navigation'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'
import { findRefereeUserInOrganization } from '@/lib/referee-org-membership'
import { loadRefereeMatchesHistory } from '@/lib/referee-dashboard-data'
import { RefereeMatchesView } from '@/components/referee/RefereeMatchesView'

export default async function AdminRefereeMatchesPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; userId: string }>
}) {
  const { organizationSlug, userId } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const referee = await findRefereeUserInOrganization(userId, organizationId)
  if (!referee) notFound()

  const matches = await loadRefereeMatchesHistory(userId, organizationId)
  const base = orgPath(organizationSlug, `/admin/referees/${userId}`)

  return (
    <RefereeMatchesView
      organizationSlug={organizationSlug}
      viewer="admin"
      refereeName={referee.name ?? 'Árbitro'}
      matches={matches}
      panelHref={`${base}/panel`}
      matchesHref={`${base}/matches`}
      adminBackHref={orgPath(organizationSlug, '/admin/referees')}
    />
  )
}
