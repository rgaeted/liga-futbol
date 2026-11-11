import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'
import { db } from '@/lib/db'
import { FixtureError } from './service'
import type { FixtureView } from './view'

type Ctx = { organizationId: string; userId: string | null; seasonId: string }

/** Envuelve un endpoint de administración del fixture: permisos, errores y revalidación. */
export async function runFixtureRoute(
  seasonId: string,
  handler: (ctx: Ctx) => Promise<FixtureView>,
): Promise<NextResponse> {
  try {
    const { organizationId, session } = await requireAdminSeason(seasonId)
    const view = await handler({ organizationId, seasonId, userId: session.user.id ?? null })

    const org = await db.organization.findUnique({ where: { id: organizationId }, select: { slug: true } })
    if (org) {
      revalidatePath(`/${org.slug}`, 'page')
      revalidatePath(`/${org.slug}/admin/fixture`, 'page')
    }
    return NextResponse.json({ view })
  } catch (error) {
    if (error instanceof FixtureError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const mapped = mapAdminSeasonRouteError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    console.error('[kelme-fixture]', error)
    return NextResponse.json({ error: 'No se pudo guardar el fixture.' }, { status: 500 })
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new FixtureError('Solicitud inválida.', 400)
  }
}
