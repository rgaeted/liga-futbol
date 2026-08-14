import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    await requirePlatformAdmin()
    const rows = await db.seasonMobileConfig.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        season: {
          select: {
            name: true,
            organization: { select: { name: true, slug: true } },
          },
        },
      },
    })

    return NextResponse.json({
      editions: rows.map((row) => ({
        seasonId: row.seasonId,
        slug: row.slug,
        displayName: row.displayName,
        isPublished: row.isPublished,
        organizationName: row.season.organization.name,
        organizationSlug: row.season.organization.slug,
        seasonName: row.season.name,
        scaffoldHint: 'Crea la carpeta Expo con scripts/create-mobile-edition.ts',
      })),
    })
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
