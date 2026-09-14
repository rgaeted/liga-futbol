import { notFound } from 'next/navigation'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'
import { findRefereeUserInOrganization } from '@/lib/referee-org-membership'
import {
  buildRefereeNextMatch,
  loadRefereeDashboardData,
} from '@/lib/referee-dashboard-data'
import { RefereePanelView } from '@/components/referee/RefereePanelView'

export default async function AdminRefereePanelPage({
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

  const data = await loadRefereeDashboardData(userId, organizationId)
  const nextMatch = buildRefereeNextMatch(organizationSlug, 'admin', data.upcoming[0])

  const base = orgPath(organizationSlug, `/admin/referees/${userId}`)

  return (
    <RefereePanelView
      organizationSlug={organizationSlug}
      viewer="admin"
      refereeName={referee.name ?? 'Árbitro'}
      photoUrl={data.photoUrl}
      stats={data.stats}
      upcoming={data.upcoming}
      finished={data.finished}
      allMatchCount={data.rows.length}
      nextMatch={nextMatch}
      matchesHref={`${base}/matches`}
      adminBackHref={orgPath(organizationSlug, '/admin/referees')}
    />
  )
}
