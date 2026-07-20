import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { claimFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
import { Role } from '@prisma/client'

export async function POST(req: Request) {
  const parsed = claimFriendlyPlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, friendlyPlayerId } = parsed.data

  const friendlyPlayer = await db.friendlyPlayer.findUnique({
    where: { id: friendlyPlayerId },
  })
  if (!friendlyPlayer) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }
  if (friendlyPlayer.userId) {
    return NextResponse.json({ error: 'Este perfil ya fue reclamado' }, { status: 409 })
  }

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const name = `${friendlyPlayer.firstName} ${friendlyPlayer.lastName}`

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, name, role: Role.PLAYER },
    })
    await tx.player.create({
      data: { userId: user.id },
    })
    await tx.friendlyPlayer.update({
      where: { id: friendlyPlayerId },
      data: { userId: user.id },
    })
  })

  return NextResponse.json({ ok: true })
}
