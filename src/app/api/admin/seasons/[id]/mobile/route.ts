import { NextResponse } from 'next/server'
import { Role, SeasonTeamStatus } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { mapPrismaError } from '@/lib/prisma-errors'
import { mobileConfigSchema } from '@/lib/validations/mobile-season'

async function countRegisteredTeamsForSeason(id: string): Promise<number> {
  return db.seasonTeam.count({
    where: { seasonId: id, status: SeasonTeamStatus.REGISTERED },
  })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.ADMIN])
    const { id } = await params
    const config = await db.seasonMobileConfig.findUnique({ where: { seasonId: id } })
    if (!config) {
      return NextResponse.json({ config: null })
    }
    return NextResponse.json({ config })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.ADMIN])
    const { id } = await params
    const parsed = mobileConfigSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const existing = await db.seasonMobileConfig.findUnique({ where: { seasonId: id } })
    const wantsPublish = parsed.data.isPublished === true

    if (wantsPublish) {
      const registered = await countRegisteredTeamsForSeason(id)
      if (registered < 2) {
        return NextResponse.json(
          { error: 'Debes inscribir al menos dos equipos antes de publicar' },
          { status: 400 },
        )
      }
    }

    if (existing?.isPublished && existing.slug !== parsed.data.slug) {
      return NextResponse.json(
        { error: 'El slug no se puede cambiar después de publicar' },
        { status: 400 },
      )
    }

    const now = new Date()
    const config = await db.seasonMobileConfig.upsert({
      where: { seasonId: id },
      create: {
        seasonId: id,
        slug: parsed.data.slug,
        displayName: parsed.data.displayName,
        shortName: parsed.data.shortName ?? null,
        description: parsed.data.description ?? null,
        primaryColor: parsed.data.primaryColor ?? null,
        secondaryColor: parsed.data.secondaryColor ?? null,
        isPublished: parsed.data.isPublished ?? false,
        publishedAt: wantsPublish ? now : null,
      },
      update: {
        slug: parsed.data.slug,
        displayName: parsed.data.displayName,
        shortName: parsed.data.shortName ?? null,
        description: parsed.data.description ?? null,
        primaryColor: parsed.data.primaryColor ?? null,
        secondaryColor: parsed.data.secondaryColor ?? null,
        isPublished: parsed.data.isPublished ?? false,
        publishedAt: wantsPublish ? (existing?.publishedAt ?? now) : null,
      },
    })

    return NextResponse.json({ config })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}

export { countRegisteredTeamsForSeason as countRegisteredTeams }
