import { NextResponse } from 'next/server'
import { mapAdminOrgRouteError, requireOrgAdminForSlug } from '@/lib/admin-org-route'
import { enforceCapability } from '@/lib/billing/enforce'
import { bestEffortDeleteEditorialObjects } from '@/lib/editorial/storage'
import { deleteOrgHeroImage } from '@/lib/org-hero-images'
import { mapPrismaError } from '@/lib/prisma-errors'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ organizationSlug: string; imageId: string }> },
) {
  try {
    const { organizationSlug, imageId } = await params
    const { organizationId } = await requireOrgAdminForSlug(organizationSlug)
    const gate = await enforceCapability(organizationId, 'PUBLISH_ORG_LANDING')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }

    const removed = await deleteOrgHeroImage(organizationId, imageId)
    if (!removed) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }

    await bestEffortDeleteEditorialObjects([removed.storagePath])
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
