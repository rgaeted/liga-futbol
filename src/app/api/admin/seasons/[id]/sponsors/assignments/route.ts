import { NextResponse } from 'next/server'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'
import { enforceCapability } from '@/lib/billing/enforce'
import { setSponsorAssignment } from '@/lib/editorial/sponsors'
import { mapPrismaError } from '@/lib/prisma-errors'
import { sponsorAssignmentSchema } from '@/lib/validations/editorial'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: seasonId } = await params
    const { organizationId } = await requireAdminSeason(seasonId)
    const gate = await enforceCapability(organizationId, 'MANAGE_LEAGUE_CONTENT')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }
    const parsed = sponsorAssignmentSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const result = await setSponsorAssignment(seasonId, parsed.data)
    if (result === 'not_found') {
      return NextResponse.json({ error: 'Patrocinador no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const mappedSeason = mapAdminSeasonRouteError(error)
    if (mappedSeason) {
      return NextResponse.json({ error: mappedSeason.message }, { status: mappedSeason.status })
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
