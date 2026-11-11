import { notFound } from 'next/navigation'
import { OrgPublicLanding } from '@/components/marketing/OrgPublicLanding'
import { OrgPublicLandingRefresh } from '@/components/marketing/OrgPublicLandingRefresh'
import { getPublicFixtureView } from '@/lib/kelme-fixture/service'
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
  const [data, panelHref, kelmeFixture] = await Promise.all([
    getOrgPublicLanding(organizationSlug),
    resolveOrgLandingPanelHref(organizationSlug),
    organizationSlug === KELME_SLUG ? getPublicFixtureView(organizationSlug) : Promise.resolve(null),
  ])
  if (!data) notFound()

  return (
    <OrgPublicLandingRefresh data={data}>
      <OrgPublicLanding data={data} panelHref={panelHref} kelmeFixture={kelmeFixture} />
    </OrgPublicLandingRefresh>
  )
}
