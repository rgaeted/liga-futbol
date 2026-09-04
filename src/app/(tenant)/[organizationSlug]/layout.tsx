import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { resolveOrgBrandColors, resolveOrgLandingLogo } from '@/lib/org-brand'
import { pausedOrganizationPayload } from '@/lib/organization-status'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}): Promise<Metadata> {
  const { organizationSlug } = await params
  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
    select: { name: true, slug: true, logoStoragePath: true },
  })
  if (!org) return {}

  const logo = resolveOrgLandingLogo(org.slug, editorialPublicUrl(org.logoStoragePath))

  return {
    title: org.name,
    description: `Torneos y marcador en vivo de ${org.name}`,
    icons: logo
      ? {
          icon: [{ url: logo }],
          apple: [{ url: logo }],
        }
      : undefined,
  }
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const org = await db.organization.findUnique({ where: { slug: organizationSlug } })
  if (!org) notFound()
  if (org.status === 'PAUSED') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B1210] p-8 text-[#E8E4D8]">
        <p>{pausedOrganizationPayload().error}</p>
      </main>
    )
  }

  const brand = resolveOrgBrandColors(org.slug, org.primaryColor, org.secondaryColor)

  return (
    <div
      style={
        {
          ['--org-primary' as string]: brand.primaryColor,
          ['--org-secondary' as string]: brand.secondaryColor,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
