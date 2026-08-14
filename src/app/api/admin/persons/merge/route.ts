import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { PersonConflictError, loadPersonFichaOrgIds } from '@/lib/person'
import { planOrgMerge } from '@/lib/person-merge'
import { MembershipRole } from '@/lib/membership-role'

const mergeSchema = z.object({
  sourcePersonId: z.string().min(1),
  destPersonId: z.string().min(1),
})

export async function POST(req: Request) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const parsed = mergeSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { sourcePersonId, destPersonId } = parsed.data
  if (sourcePersonId === destPersonId) {
    return NextResponse.json({ error: 'Elige dos personas distintas' }, { status: 400 })
  }

  try {
    await db.$transaction(async (tx) => {
      const [sourceIds, destIds] = await Promise.all([
        loadPersonFichaOrgIds(tx, sourcePersonId),
        loadPersonFichaOrgIds(tx, destPersonId),
      ])

      const [sourcePerson, destPerson] = await Promise.all([
        tx.person.findUniqueOrThrow({
          where: { id: sourcePersonId },
          select: { id: true, userId: true },
        }),
        tx.person.findUniqueOrThrow({
          where: { id: destPersonId },
          select: { id: true, userId: true },
        }),
      ])

      const plan = planOrgMerge({
        organizationId,
        source: {
          id: sourcePerson.id,
          userId: sourcePerson.userId,
          playerOrgIds: sourceIds.existingPlayerOrgIds,
          friendlyOrgIds: sourceIds.existingFriendlyOrgIds,
        },
        dest: {
          id: destPerson.id,
          userId: destPerson.userId,
          playerOrgIds: destIds.existingPlayerOrgIds,
          friendlyOrgIds: destIds.existingFriendlyOrgIds,
        },
      })

      if (plan.movePlayerOrgIds.length > 0) {
        await tx.player.updateMany({
          where: { personId: sourcePersonId, organizationId },
          data: { personId: destPersonId },
        })
      }
      if (plan.moveFriendlyOrgIds.length > 0) {
        await tx.friendlyPlayer.updateMany({
          where: { personId: sourcePersonId, organizationId },
          data: { personId: destPersonId },
        })
      }
      if (plan.deleteSourcePerson) {
        await tx.person.delete({ where: { id: sourcePersonId } })
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof PersonConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    throw error
  }
}
