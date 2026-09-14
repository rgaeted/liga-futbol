import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'
import {
  buildRefereeNextMatch,
  loadRefereeDashboardData,
} from '@/lib/referee-dashboard-data'
import { RefereePanelView } from '@/components/referee/RefereePanelView'

export default async function RefereeDashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { organizationSlug } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const data = await loadRefereeDashboardData(session.user.id, organizationId)
  const nextMatch = buildRefereeNextMatch(organizationSlug, 'self', data.upcoming[0])

  return (
    <RefereePanelView
      organizationSlug={organizationSlug}
      viewer="self"
      refereeName={data.user?.name ?? session.user.name ?? 'Árbitro'}
      photoUrl={data.photoUrl}
      stats={data.stats}
      upcoming={data.upcoming}
      finished={data.finished}
      allMatchCount={data.rows.length}
      nextMatch={nextMatch}
      matchesHref={orgPath(organizationSlug, '/referee/matches')}
    />
  )
}
