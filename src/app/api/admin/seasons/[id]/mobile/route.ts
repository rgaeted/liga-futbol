import { NextResponse } from 'next/server'
import { SeasonTeamStatus } from '@prisma/client'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'
import { db } from '@/lib/db'
import { parseMobileEditionSlug } from '@/lib/mobile-edition-slug'
import { mapPrismaError } from '@/lib/prisma-errors'
import { mobileConfigSchema } from '@/lib/validations/mobile-season'

async function countRegisteredTeamsForSeason(id: string): Promise<number> {
  return db.seasonTeam.count({
    where: { seasonId: id, status: SeasonTeamStatus.REGISTERED },
  })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireAdminSeason(id)
    const config = await db.seasonMobileConfig.findUnique({ where: { seasonId: id } })
    if (!config) {
      return NextResponse.json({ config: null })
    }
    return NextResponse.json({ config })
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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireAdminSeason(id)
    const parsed = mobileConfigSchema.safeParse(await req.json())
    if (!parsed.success) {
      const slugIssue = parsed.error.issues.find((issue) => issue.path[0] === 'slug')
      return NextResponse.json(
        { error: slugIssue?.message ?? 'Datos inválidos' },
        { status: 400 },
      )
    }

    const parsedSlug = parseMobileEditionSlug(parsed.data.slug)
    if (!parsedSlug.ok) {
      return NextResponse.json(
        { error: parsedSlug.error === 'reserved' ? 'El slug está reservado' : 'Slug inválido' },
        { status: 400 },
      )
    }

    const existing = await db.seasonMobileConfig.findUnique({ where: { seasonId: id } })
    const wantsPublish = parsed.data.isPublished === true

    if (existing && existing.slug !== parsed.data.slug) {
      return NextResponse.json(
        { error: 'El slug no se puede cambiar después' },
        { status: 400 },
      )
    }

    if (wantsPublish) {
      const registered = await countRegisteredTeamsForSeason(id)
      if (registered < 1) {
        return NextResponse.json(
          { error: 'Debes inscribir al menos un equipo antes de publicar' },
          { status: 400 },
        )
      }
      const logoPath = existing?.logoStoragePath
      if (!logoPath) {
        return NextResponse.json(
          { error: 'Sube el logo de la edición antes de publicar' },
          { status: 400 },
        )
      }
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
    const mappedSeason = mapAdminSeasonRouteError(error)
    if (mappedSeason) {
      return NextResponse.json({ error: mappedSeason.message }, { status: mappedSeason.status })
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}

export { countRegisteredTeamsForSeason as countRegisteredTeams }
