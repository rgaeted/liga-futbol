import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { formatApiError } from '@/lib/api-error'
import { mapPrismaError } from '@/lib/prisma-errors'
import { createFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
import { Role } from '@prisma/client'

export async function GET() {
  try {
    await requireRole([Role.ADMIN])
    const players = await db.friendlyPlayer.findMany({
      include: { user: { select: { id: true, email: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    return NextResponse.json(players)
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    }
    console.error('GET /api/friendly-players', error)
    return NextResponse.json({ error: 'Error al listar jugadores' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireRole([Role.ADMIN])
    const parsed = createFriendlyPlayerSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatApiError(parsed.error.flatten()) },
        { status: 400 }
      )
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
          ...(dominantFoot ? { dominantFoot } : {}),
          ...(primaryPosition ? { primaryPosition } : {}),
          ...(secondaryPosition ? { secondaryPosition } : {}),
          ...(userId ? { userId } : {}),
        },
        include: { user: { select: { id: true, email: true } } },
      })
    })

    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    }
    console.error('POST /api/friendly-players', error)
    return NextResponse.json({ error: 'Error al crear jugador amistoso' }, { status: 500 })
  }
}
