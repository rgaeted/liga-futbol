import { NextResponse } from 'next/server'
import { fixtureExportFileName, fixtureWorkbookBuffer, type ExportableFixture } from '@/lib/kelme-fixture/export'
import { getPublicFixtureView } from '@/lib/kelme-fixture/service'

export const dynamic = 'force-dynamic'

/** Fixture público de la liga (partidos y posiciones) como planilla de Excel. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ organizationSlug: string }> },
) {
  const { organizationSlug } = await params
  // Con ?season=<id> se exporta esa fecha del torneo; sin él, el cuadro de la Kelme Cup.
  const seasonId = new URL(req.url).searchParams.get('season')
  let view: ExportableFixture | null = null
  let fileSuffix: string | undefined
  if (seasonId) {
    const { getPublicJornadas } = await import('@/lib/kelme-fixture/jornada')
    const jornada = (await getPublicJornadas(organizationSlug)).find((j) => j.seasonId === seasonId)
    view = jornada?.view ?? null
    fileSuffix = jornada?.startsAt.slice(0, 10)
  } else {
    view = await getPublicFixtureView(organizationSlug)
  }
  if (!view) {
    return NextResponse.json({ error: 'Esta liga no tiene fixture' }, { status: 404 })
  }

  const buffer = await fixtureWorkbookBuffer(view)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fixtureExportFileName(organizationSlug, fileSuffix)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
