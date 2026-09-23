import { NextResponse } from 'next/server'
import { requireOrgRole } from '@/lib/auth'
import { enforceCapability } from '@/lib/billing/enforce'
import { bestEffortDeleteEditorialObjects } from '@/lib/editorial/storage'
import { deleteOrgHeroImage } from '@/lib/org-hero-images'
import { MembershipRole } from '@/lib/membership-role'
import { mapPrismaError } from '@/lib/prisma-errors'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const gate = await enforceCapability(organizationId, 'PUBLISH_ORG_LANDING')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }

    const { imageId } = await params
    const removed = await deleteOrgHeroImage(organizationId, imageId)
    if (!removed) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }

    await bestEffortDeleteEditorialObjects([removed.storagePath])
    return NextResponse.json({ ok: true })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
