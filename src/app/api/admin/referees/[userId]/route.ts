import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole, hasMembershipRole } from '@/lib/membership-role'
import { mapPrismaError } from '@/lib/prisma-errors'
import { normalizePhoneField } from '@/lib/referees'
import { patchRefereeSchema } from '@/lib/validations/referee'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { userId } = await params
    const parsed = patchRefereeSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const membership = await db.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    })
    if (!membership || !hasMembershipRole(membership.roles, MembershipRole.REFEREE)) {
      return NextResponse.json({ error: 'Árbitro no encontrado' }, { status: 404 })
    }

    const { phone, whatsapp, notes } = parsed.data
    await db.refereeProfile.upsert({
      where: { userId },
      create: {
        userId,
        phone: normalizePhoneField(phone),
        whatsapp: normalizePhoneField(whatsapp),
        notes: notes ?? null,
      },
      update: {
        phone: normalizePhoneField(phone),
        whatsapp: normalizePhoneField(whatsapp),
        notes: notes ?? null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
