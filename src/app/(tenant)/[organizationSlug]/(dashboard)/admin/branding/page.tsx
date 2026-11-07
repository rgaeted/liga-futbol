import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrgHeroImageGrid } from '@/components/admin/OrgHeroImageGrid'
import { planHasCapability } from '@/lib/billing/capabilities'
import { db } from '@/lib/db'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { listOrgHeroImages } from '@/lib/org-hero-images'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'

export const dynamic = 'force-dynamic'

export default async function AdminBrandingPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { plan: true, slug: true },
  })

  if (!planHasCapability(organization.plan, 'PUBLISH_ORG_LANDING')) {
    return (
      <div className="space-y-4 rounded-lg border border-kelme-border p-6">
        <h1 className="font-display text-2xl font-bold">Landing pública</h1>
        <p className="text-sm text-[#8A938C]">
          Tu plan actual no incluye personalización de la landing. Pasa a Club o Liga para subir
          fotos del hero y publicar tu página pública.
        </p>
      </div>
    )
  }

  const images = await listOrgHeroImages(organizationId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Landing pública</h1>
        <p className="mt-1 text-sm text-[#8A938C]">
          Configura la portada que ven quienes entran a{' '}
          <Link href={orgPath(organizationSlug, '/')} className="text-kelme-red hover:underline">
            /{organization.slug}
          </Link>
          .
        </p>
      </div>

      <OrgHeroImageGrid
        organizationSlug={organizationSlug}
        images={images.map((image) => ({
          id: image.id,
          storagePath: image.storagePath,
          url: editorialPublicUrl(image.storagePath),
          sortOrder: image.sortOrder,
        }))}
      />
    </div>
  )
}
