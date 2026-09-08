import { notFound } from 'next/navigation'
import { OrgPublicLanding } from '@/components/marketing/OrgPublicLanding'
import { OrgPublicLandingRefresh } from '@/components/marketing/OrgPublicLandingRefresh'
import { getOrgPublicLanding } from '@/lib/org-public-landing'
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

  return (
    <OrgPublicLandingRefresh data={data}>
      <OrgPublicLanding data={data} panelHref={panelHref} />
    </OrgPublicLandingRefresh>
  )
}
