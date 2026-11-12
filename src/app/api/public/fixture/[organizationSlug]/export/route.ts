import { NextResponse } from 'next/server'
import { fixtureExportFileName, fixtureWorkbookBuffer } from '@/lib/kelme-fixture/export'
import { getPublicFixtureView } from '@/lib/kelme-fixture/service'

export const dynamic = 'force-dynamic'

/** Fixture público de la liga (partidos y posiciones) como planilla de Excel. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ organizationSlug: string }> },
) {
  const { organizationSlug } = await params
  const view = await getPublicFixtureView(organizationSlug)
  if (!view) {
    return NextResponse.json({ error: 'Esta liga no tiene fixture' }, { status: 404 })
  }

  const buffer = await fixtureWorkbookBuffer(view)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fixtureExportFileName(organizationSlug)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
