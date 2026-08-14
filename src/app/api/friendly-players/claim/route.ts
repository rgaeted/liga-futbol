import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { claimFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
import { MembershipRole } from '@/lib/membership-role'
import { canClaimPerson, assertPersonFichaAvailable, loadPersonFichaOrgIds } from '@/lib/person'

export async function POST(req: Request) {
  const parsed = claimFriendlyPlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, friendlyPlayerId } = parsed.data

  const friendlyPlayer = await db.friendlyPlayer.findUnique({
    where: { id: friendlyPlayerId },
    include: { person: { select: { id: true, userId: true } } },
  })
  if (!friendlyPlayer) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const gate = canClaimPerson(friendlyPlayer.person.userId, null, friendlyPlayer.person.id)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const name = `${friendlyPlayer.firstName} ${friendlyPlayer.lastName}`

  await db.$transaction(async (tx) => {
    const person = await tx.person.findUniqueOrThrow({ where: { id: friendlyPlayer.personId } })
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
        organizationId: friendlyPlayer.organizationId,
        userId: user.id,
        role: MembershipRole.PLAYER,
      },
    })

    const fichaIds = await loadPersonFichaOrgIds(tx, person.id)
    if (!fichaIds.existingPlayerOrgIds.includes(friendlyPlayer.organizationId)) {
      assertPersonFichaAvailable({
        ...fichaIds,
        organizationId: friendlyPlayer.organizationId,
        kind: 'league',
      })
      await tx.player.create({
        data: {
          personId: person.id,
          organizationId: friendlyPlayer.organizationId,
        },
      })
    }
  })

  return NextResponse.json({ ok: true })
}
