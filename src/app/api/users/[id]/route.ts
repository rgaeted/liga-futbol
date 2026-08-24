import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { updateUserSchema } from '@/lib/validations/user'
import { MembershipRole, hasMembershipRole, primaryMembershipRole } from '@/lib/membership-role'

function mergeAssignableRoles(
  currentRoles: MembershipRole[],
  assignableRoles: MembershipRole[],
): MembershipRole[] {
  const autoRoles = currentRoles.filter((role) => role === MembershipRole.FRIENDLY_COACH)
  return [...new Set([...assignableRoles, ...autoRoles])]
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId, session } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params
  const parsed = updateUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { password, roles: assignableRoles, ...rest } = parsed.data

  if (
    session.user.id === id &&
    assignableRoles &&
    !assignableRoles.includes(MembershipRole.ORG_ADMIN)
  ) {
    return NextResponse.json(
      { error: 'No puedes quitarte tu propio rol de administrador' },
      { status: 409 },
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
    if (
      assignableRoles &&
      !assignableRoles.includes(MembershipRole.COACH) &&
      hasMembershipRole(membership.roles, MembershipRole.COACH)
    ) {
      await tx.team.updateMany({
        where: { coachId: id, organizationId },
        data: { coachId: null },
      })
    }

    if (assignableRoles) {
      await tx.organizationMembership.update({
        where: {
          organizationId_userId: { organizationId, userId: id },
        },
        data: { roles: mergeAssignableRoles(membership.roles, assignableRoles) },
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
    select: { roles: true },
  })

  return NextResponse.json({
    ...user,
    roles: updatedMembership.roles,
    role: primaryMembershipRole(updatedMembership.roles),
  })
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
    include: {
      person: {
        select: {
          players: { where: { organizationId }, select: { id: true }, take: 1 },
        },
      },
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  if (user.person?.players[0]) {
    return NextResponse.json(
      { error: 'Es un jugador: elimínalo desde la sección Jugadores' },
      { status: 409 },
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
