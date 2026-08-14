import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { createUserSchema } from '@/lib/validations/user'
import { MembershipRole } from '@/lib/membership-role'
import { resolveUserRoleTags } from '@/lib/user-roles-display'

export async function GET() {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const memberships = await db.organizationMembership.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          coachedTeam: { select: { id: true } },
          friendlyPlayer: {
            select: {
              id: true,
              participations: { where: { isCoach: true }, select: { id: true }, take: 1 },
            },
          },
          player: { select: { teamId: true } },
        },
      },
    },
    orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
  })
  return NextResponse.json(
    memberships.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      createdAt: m.user.createdAt,
      roleTags: resolveUserRoleTags({
        role: m.role,
        hasCoachedTeam: Boolean(m.user.coachedTeam),
        hasLeagueTeam: Boolean(m.user.player?.teamId),
        hasFriendlyProfile: Boolean(m.user.friendlyPlayer),
        isFriendlyCoach: Boolean(m.user.friendlyPlayer?.participations.length),
      }),
    }))
  )
}

export async function POST(req: Request) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const parsed = createUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, name, password, role } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true },
    })
    await tx.organizationMembership.create({
      data: { organizationId, userId: created.id, role },
    })
    return { ...created, role }
  })
  return NextResponse.json(user, { status: 201 })
}
