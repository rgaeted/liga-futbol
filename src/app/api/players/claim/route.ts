import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { claimPlayerSchema } from '@/lib/validations/player'
import { MembershipRole } from '@/lib/membership-role'
import { canClaimPerson } from '@/lib/person'
import { playerDisplayName } from '@/lib/person-name'

export async function POST(req: Request) {
  const parsed = claimPlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, playerId } = parsed.data

  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { person: { select: { id: true, userId: true, firstName: true, lastName: true } } },
  })
  if (!player) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const gate = canClaimPerson(player.person.userId, null, player.person.id)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const name = playerDisplayName(player.person)

  await db.$transaction(async (tx) => {
    const person = await tx.person.findUniqueOrThrow({ where: { id: player.personId } })
    const claimGate = canClaimPerson(person.userId, null, person.id)
    if (!claimGate.ok) {
      throw Object.assign(new Error(claimGate.error), { status: claimGate.status })
    }

    const user = await tx.user.create({
      data: { email, passwordHash, name },
    })
    await tx.person.update({ where: { id: person.id }, data: { userId: user.id } })
    await tx.organizationMembership.create({
      data: {
        organizationId: player.organizationId,
        userId: user.id,
        role: MembershipRole.PLAYER,
      },
    })
  })

  return NextResponse.json({ ok: true })
}
