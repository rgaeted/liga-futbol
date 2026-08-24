import { notFound } from 'next/navigation'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import { OrgPublicLanding } from '@/components/marketing/OrgPublicLanding'
import { getOrgPublicLanding } from '@/lib/org-public-landing'

export const dynamic = 'force-dynamic'

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const data = await getOrgPublicLanding(organizationSlug)
  if (!data) notFound()

  const orgPath = `/${data.organization.slug}`

  return (
    <MarketingShell
      productName={data.organization.name}
      homeHref={orgPath}
      ayudaHref={`${orgPath}/ayuda`}
      loginCallback={orgPath}
      active="home"
    >
      <OrgPublicLanding data={data} />
    </MarketingShell>
  )
}
