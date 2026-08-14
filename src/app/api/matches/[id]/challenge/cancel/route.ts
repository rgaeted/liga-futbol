import { NextResponse } from 'next/server'
import { ChallengeStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { nextChallengeStatus } from '@/lib/match-challenge'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { id } = await params

    const match = await db.match.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        challengeStatus: true,
      },
    })
    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }
    if (match.organizationId !== organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    if (match.challengeStatus !== ChallengeStatus.PENDING) {
      return NextResponse.json({ error: 'El desafío ya no está pendiente' }, { status: 409 })
    }

    let nextStatus: ChallengeStatus
    try {
      nextStatus = nextChallengeStatus('cancel', match.challengeStatus)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Transición inválida' },
        { status: 409 }
      )
    }

    const updated = await db.match.update({
      where: { id },
      data: { challengeStatus: nextStatus },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.error('POST /api/matches/[id]/challenge/cancel failed', error)
    return NextResponse.json({ error: 'Error al cancelar el desafío' }, { status: 500 })
  }
}
