import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { updateFriendlyGalletaSchema } from '@/lib/validations/match'
import { MembershipRole } from '@/lib/membership-role'
import {
  assertCanEditFriendlySide,
  isChallengeParticipant,
} from '@/lib/match-challenge'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; participationId: string }> }
) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { id: matchId, participationId } = await params

    const match = await db.match.findUnique({
      where: { id: matchId },
      select: {
        organizationId: true,
        guestOrganizationId: true,
        challengeStatus: true,
        matchType: true,
      },
    })
    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }

    if (match.guestOrganizationId) {
      if (!isChallengeParticipant(match, organizationId)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    } else if (match.organizationId !== organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const parsed = updateFriendlyGalletaSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const participation = await db.friendlyMatchPlayer.findFirst({
      where: { id: participationId, matchId },
    })
    if (!participation) {
      return NextResponse.json({ error: 'Participación no encontrada' }, { status: 404 })
    }

    if (
      !assertCanEditFriendlySide({
        actorOrganizationId: organizationId,
        match,
        side: participation.side,
      })
    ) {
      return NextResponse.json({ error: 'No puedes editar este jugador' }, { status: 403 })
    }

    const updated = await db.friendlyMatchPlayer.update({
      where: { id: participationId },
      data: { isGalleta: parsed.data.isGalleta },
      include: { friendlyPlayer: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.error('PATCH galleta failed', error)
    return NextResponse.json({ error: 'Error al actualizar galleta' }, { status: 500 })
  }
}
