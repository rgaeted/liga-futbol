import { NextResponse } from 'next/server'
import { deleteSponsor, updateSponsor } from '@/lib/editorial/sponsors'
import { bestEffortDeleteEditorialObjects } from '@/lib/editorial/storage'
import { mapPrismaError } from '@/lib/prisma-errors'
import { updateSponsorSchema } from '@/lib/validations/editorial'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; sponsorId: string }> },
) {
  try {
    const { id: seasonId, sponsorId } = await params
    await requireAdminSeason(seasonId)
    const parsed = updateSponsorSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const sponsor = await updateSponsor(seasonId, sponsorId, parsed.data)
    if (!sponsor) {
      return NextResponse.json({ error: 'Patrocinador no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ sponsor })
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; sponsorId: string }> },
) {
  try {
    const { id: seasonId, sponsorId } = await params
    await requireAdminSeason(seasonId)
    const removed = await deleteSponsor(seasonId, sponsorId)
    if (!removed) {
      return NextResponse.json({ error: 'Patrocinador no encontrado' }, { status: 404 })
    }

    await bestEffortDeleteEditorialObjects(
      [removed.logoStoragePath, removed.bannerStoragePath].filter(
        (path): path is string => Boolean(path),
      ),
    )
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
