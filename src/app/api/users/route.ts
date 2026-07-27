import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createUserSchema } from '@/lib/validations/user'
import { Role } from '@prisma/client'

import { resolveUserRoleTags } from '@/lib/user-roles-display'

export async function GET() {
  await requireRole([Role.ADMIN])
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
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
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      roleTags: resolveUserRoleTags({
        role: u.role,
        hasCoachedTeam: Boolean(u.coachedTeam),
        hasLeagueTeam: Boolean(u.player?.teamId),
        hasFriendlyProfile: Boolean(u.friendlyPlayer),
        isFriendlyCoach: Boolean(u.friendlyPlayer?.participations.length),
      }),
    }))
  )
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
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
  const user = await db.user.create({
    data: { email, name, passwordHash, role },
    select: { id: true, email: true, name: true, role: true },
  })
  return NextResponse.json(user, { status: 201 })
}
