import { NextResponse } from 'next/server'
import { requireOrgRole } from '@/lib/auth'
import { enforceCapability } from '@/lib/billing/enforce'
import { reorderOrgHeroImages } from '@/lib/org-hero-images'
import { MembershipRole } from '@/lib/membership-role'
import { mapPrismaError } from '@/lib/prisma-errors'
import { reorderOrgHeroImagesSchema } from '@/lib/validations/org-hero-image'

export async function PUT(req: Request) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
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
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
