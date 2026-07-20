import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
import { Role } from '@prisma/client'

export async function GET() {
  await requireRole([Role.ADMIN])
  const players = await db.friendlyPlayer.findMany({
    include: { user: { select: { id: true, email: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
  return NextResponse.json(players)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createFriendlyPlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { firstName, lastName, email, password, dominantFoot, primaryPosition, secondaryPosition } =
    parsed.data

  const player = await db.$transaction(async (tx) => {
    let userId: string | undefined
    if (email && password) {
      const passwordHash = await bcrypt.hash(password, 10)
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: `${firstName} ${lastName}`,
          role: Role.PLAYER,
        },
      })
      await tx.player.create({
        data: { userId: user.id },
      })
      userId = user.id
    }

    return tx.friendlyPlayer.create({
      data: {
        firstName,
        lastName,
        dominantFoot,
        primaryPosition,
        secondaryPosition,
        userId,
      },
      include: { user: { select: { id: true, email: true } } },
    })
  })

  return NextResponse.json(player, { status: 201 })
}