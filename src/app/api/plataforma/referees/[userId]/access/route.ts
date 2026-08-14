import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { mapPrismaError } from '@/lib/prisma-errors'
import { grantRefereeAccessSchema } from '@/lib/validations/referee'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await requirePlatformAdmin()
    const { userId } = await params
    const parsed = grantRefereeAccessSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { organizationId } = parsed.data

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    })
    if (!org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const existing = await db.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    })
    if (existing?.role === MembershipRole.REFEREE) {
      return NextResponse.json(
        { error: 'Este árbitro ya pita en la organización' },
        { status: 409 },
      )
    }
    if (existing) {
      return NextResponse.json(
        { error: 'Este correo ya tiene otro rol en la organización' },
        { status: 409 },
      )
    }

    await db.$transaction(async (tx) => {
      if (!existing) {
        await tx.organizationMembership.create({
          data: { organizationId, userId, role: MembershipRole.REFEREE },
        })
      }
      await tx.refereeProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      })
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
