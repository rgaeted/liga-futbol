import { NextResponse } from 'next/server'
import { ChallengeStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { nextChallengeStatus } from '@/lib/match-challenge'

async function loadPendingChallenge(matchId: string) {
  return db.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      organizationId: true,
      guestOrganizationId: true,
      challengeStatus: true,
      matchType: true,
    },
  })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { id } = await params

    const match = await loadPendingChallenge(id)
    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }
    if (match.guestOrganizationId !== organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    if (match.challengeStatus !== ChallengeStatus.PENDING) {
      return NextResponse.json({ error: 'El desafío ya no está pendiente' }, { status: 409 })
    }

    const guestOrg = await db.organization.findUnique({
      where: { id: organizationId },
      select: { status: true },
    })
    if (!guestOrg || guestOrg.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Tu organización debe estar activa para aceptar desafíos' },
        { status: 400 }
      )
    }

    let nextStatus: ChallengeStatus
    try {
      nextStatus = nextChallengeStatus('accept', match.challengeStatus)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Transición inválida' },
        { status: 409 }
      )
    }

    const updated = await db.match.update({
      where: { id },
      data: { challengeStatus: nextStatus },
      include: {
        guestOrganization: { select: { id: true, slug: true, name: true } },
        organization: { select: { id: true, slug: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.error('POST /api/matches/[id]/challenge/accept failed', error)
    return NextResponse.json({ error: 'Error al aceptar el desafío' }, { status: 500 })
  }
}
