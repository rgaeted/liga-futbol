import { NextResponse } from 'next/server'
import { mapAdminOrgRouteError, requireOrgAdminForSlug } from '@/lib/admin-org-route'
import { enforceCapability } from '@/lib/billing/enforce'
import { reorderOrgHeroImages } from '@/lib/org-hero-images'
import { mapPrismaError } from '@/lib/prisma-errors'
import { reorderOrgHeroImagesSchema } from '@/lib/validations/org-hero-image'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ organizationSlug: string }> },
) {
  try {
    const { organizationSlug } = await params
    const { organizationId } = await requireOrgAdminForSlug(organizationSlug)
    const gate = await enforceCapability(organizationId, 'PUBLISH_ORG_LANDING')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }

    const parsed = reorderOrgHeroImagesSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const result = await reorderOrgHeroImages(organizationId, parsed.data.imageIds)
    if (!result.ok) {
      return NextResponse.json({ error: 'Orden de fotos inválido' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const mappedOrg = mapAdminOrgRouteError(error)
    if (mappedOrg) {
      return NextResponse.json({ error: mappedOrg.message }, { status: mappedOrg.status })
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
