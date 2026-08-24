import { notFound } from 'next/navigation'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import { OrgPublicLanding } from '@/components/marketing/OrgPublicLanding'
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

  const orgPath = `/${data.organization.slug}`

  return (
    <MarketingShell
      productName={data.organization.name}
      homeHref={orgPath}
      ayudaHref={`${orgPath}/ayuda`}
      loginCallback={orgPath}
      panelHref={panelHref}
      active="home"
    >
      <OrgPublicLanding data={data} panelHref={panelHref} />
    </MarketingShell>
  )
}
