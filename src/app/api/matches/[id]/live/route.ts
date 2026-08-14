import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getLiveMatchSnapshot } from '@/lib/live-match-snapshot'
import { pausedOrganizationPayload } from '@/lib/org-scope'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const matchOrg = await db.match.findUnique({
      where: { id },
      select: { organization: { select: { status: true } } },
    })
    if (!matchOrg) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }
    if (matchOrg.organization.status === 'PAUSED') {
      return NextResponse.json(pausedOrganizationPayload(), { status: 503 })
    }

    const snapshot = await getLiveMatchSnapshot(id)
    if (!snapshot) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }
    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('live_match_snapshot_failed', {
      matchId: id,
      reason: error instanceof Error ? error.name : 'unknown_error',
    })
    return NextResponse.json(
      { error: 'No se pudo cargar el partido en vivo' },
      { status: 500 }
    )
  }
}
