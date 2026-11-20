import { notFound } from 'next/navigation'
import { OrgPublicLanding } from '@/components/marketing/OrgPublicLanding'
import { OrgPublicLandingRefresh } from '@/components/marketing/OrgPublicLandingRefresh'
import { getFixtureRosters } from '@/lib/kelme-fixture/rosters'
import { getPublicJornadas } from '@/lib/kelme-fixture/jornada'
import { getLandingSponsorsBySlug } from '@/lib/sponsors/landing-query'
import { KELME_SLUG } from '@/lib/org-brand'
import { getOrgPublicLanding } from '@/lib/org-public-landing'
import { resolveOrgLandingPanelHref } from '@/lib/org-landing-panel-href'

export const dynamic = 'force-dynamic'

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const [data, panelHref, kelmeJornadas, sponsors] = await Promise.all([
    getOrgPublicLanding(organizationSlug),
    resolveOrgLandingPanelHref(organizationSlug),
    organizationSlug === KELME_SLUG ? getPublicJornadas(organizationSlug) : Promise.resolve([]),
    getLandingSponsorsBySlug(organizationSlug).catch(() => null),
  ])
  if (!data) notFound()
  const kelmeRosters = kelmeJornadas[0] ? await getFixtureRosters(kelmeJornadas[0].seasonId) : []

  return (
    <OrgPublicLandingRefresh data={data}>
      <OrgPublicLanding
        data={data}
        panelHref={panelHref}
        kelmeJornadas={kelmeJornadas}
        kelmeRosters={kelmeRosters}
        sponsors={sponsors}
      />
    </OrgPublicLandingRefresh>
  )
}
