import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'
import { loadRefereeMatchesHistory } from '@/lib/referee-dashboard-data'
import { RefereeMatchesView } from '@/components/referee/RefereeMatchesView'

export default async function RefereeMatchesPage({
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

  const [matches, user] = await Promise.all([
    loadRefereeMatchesHistory(session.user.id, organizationId),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    }),
  ])

  return (
    <RefereeMatchesView
      organizationSlug={organizationSlug}
      viewer="self"
      refereeName={user?.name ?? session.user.name ?? 'Árbitro'}
      matches={matches}
      panelHref={orgPath(organizationSlug, '/referee')}
      matchesHref={orgPath(organizationSlug, '/referee/matches')}
    />
  )
}
