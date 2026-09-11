import { NextResponse } from 'next/server'
import { getLosLunesPlayerCard } from '@/lib/player-card-query'
import { PAUSED_ORGANIZATION_STATUS, pausedOrganizationPayload } from '@/lib/organization-status'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await getLosLunesPlayerCard(id)
  if (result.kind === 'not_found') {
    return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 })
  }
  if (result.kind === 'paused') {
    return NextResponse.json(pausedOrganizationPayload(), { status: PAUSED_ORGANIZATION_STATUS })
  }
  return NextResponse.json(result.card)
}
