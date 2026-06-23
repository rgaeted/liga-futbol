import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createPlayerSchema } from '@/lib/validations/player'
import { Role } from '@prisma/client'

export async function GET() {
  await requireRole([Role.ADMIN, Role.COACH])
  const players = await db.player.findMany({
    include: {
      user: { select: { name: true, email: true } },
      team: { select: { name: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })
  return NextResponse.json(players)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const body = await req.json()
  const parsed = createPlayerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, name, password, teamId, jerseyNumber, position } = parsed.data
  const passwordHash = await bcrypt.hash(password, 10)

  const player = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, passwordHash, role: Role.PLAYER },
    })
    return tx.player.create({
      data: { userId: user.id, teamId, jerseyNumber, position },
      include: { user: true, team: true },
    })
  })

  return NextResponse.json(player, { status: 201 })
}
