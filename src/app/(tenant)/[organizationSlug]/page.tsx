import { notFound } from 'next/navigation'
import { OrgPublicLanding } from '@/components/marketing/OrgPublicLanding'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getOrgPublicLanding } from '@/lib/org-public-landing'
import { findPlayerInOrganization } from '@/lib/player-org-profile'
import { resolveOrgLandingPanelHref } from '@/lib/org-landing-panel-href'

export const dynamic = 'force-dynamic'

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const [data, panelHref] = await Promise.all([
    getOrgPublicLanding(organizationSlug),
    resolveOrgLandingPanelHref(organizationSlug),
  ])
  if (!data) notFound()

  const session = await auth()
  let attendanceViewer = {
    signedIn: false,
    canSign: false,
    myPlayerId: null as string | null,
    loginHref: `/login?callbackUrl=/${organizationSlug}#asistencia`,
  }
  if (session?.user?.id) {
    const org = await db.organization.findUnique({
      where: { slug: organizationSlug },
      select: { id: true },
    })
    if (org) {
      const player = await findPlayerInOrganization(session.user.id, org.id)
      attendanceViewer = {
        signedIn: true,
        canSign: Boolean(player),
        myPlayerId: player?.id ?? null,
        loginHref: `/login?callbackUrl=/${organizationSlug}#asistencia`,
      }
    }
  }

  return (
    <OrgPublicLanding
      data={data}
      panelHref={panelHref}
      attendanceViewer={attendanceViewer}
    />
  )
}
