import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { updateUserSchema } from '@/lib/validations/user'
import { MembershipRole } from '@/lib/membership-role'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId, session } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params
  const parsed = updateUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { password, role, ...rest } = parsed.data

  if (session.user.id === id && role && role !== MembershipRole.ORG_ADMIN) {
    return NextResponse.json(
      { error: 'No puedes cambiar tu propio rol de acceso' },
      { status: 409 }
    )
  }

  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: id },
    },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const user = await db.$transaction(async (tx) => {
    if (role && role !== MembershipRole.COACH && membership.role === MembershipRole.COACH) {
      await tx.team.updateMany({
        where: { coachId: id, organizationId },
        data: { coachId: null },
      })
    }

    if (role) {
      await tx.organizationMembership.update({
        where: {
          organizationId_userId: { organizationId, userId: id },
        },
        data: { role },
      })
    }

    return tx.user.update({
      where: { id },
      data: {
        ...rest,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
      select: { id: true, email: true, name: true },
    })
  })

  const updatedMembership = await db.organizationMembership.findUniqueOrThrow({
    where: { organizationId_userId: { organizationId, userId: id } },
    select: { role: true },
  })

  return NextResponse.json({ ...user, role: updatedMembership.role })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId, session } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  if (session.user.id === id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 409 })
  }

  const membership = await db.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: id } },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const user = await db.user.findUnique({
    where: { id },
    include: { player: { select: { id: true } } },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  if (user.player) {
    return NextResponse.json(
      { error: 'Es un jugador: elimínalo desde la sección Jugadores' },
      { status: 409 }
    )
  }

  const otherMemberships = await db.organizationMembership.count({
    where: { userId: id, organizationId: { not: organizationId } },
  })

  if (otherMemberships > 0) {
    await db.$transaction([
      db.team.updateMany({
        where: { coachId: id, organizationId },
        data: { coachId: null },
      }),
      db.match.updateMany({
        where: { refereeId: id, organizationId },
        data: { refereeId: null },
      }),
      db.organizationMembership.delete({
        where: { organizationId_userId: { organizationId, userId: id } },
      }),
    ])
  } else {
    await db.$transaction([
      db.team.updateMany({ where: { coachId: id }, data: { coachId: null } }),
      db.match.updateMany({ where: { refereeId: id }, data: { refereeId: null } }),
      db.organizationMembership.delete({
        where: { organizationId_userId: { organizationId, userId: id } },
      }),
      db.user.delete({ where: { id } }),
    ])
  }

  return NextResponse.json({ ok: true })
}
