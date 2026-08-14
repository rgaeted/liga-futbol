import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { assertSeasonInOrganization } from '@/lib/org-scope'
import { getAdminDashboardData } from '@/lib/admin-dashboard'

const getCachedDashboard = unstable_cache(
  async (seasonId: string | null) => getAdminDashboardData(seasonId),
  ['admin-dashboard'],
  { revalidate: 30 }
)

export async function GET(req: Request) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const seasonId = new URL(req.url).searchParams.get('season')

    if (seasonId) {
      await assertSeasonInOrganization(seasonId, organizationId)
    }

    const data = await getCachedDashboard(seasonId)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'NotFound') {
      return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 })
    }
    if (err instanceof Error && err.message === 'Forbidden') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    console.error('[admin/dashboard]', err)
    return NextResponse.json({ error: 'No se pudieron cargar los datos del panel' }, { status: 500 })
  }
}
