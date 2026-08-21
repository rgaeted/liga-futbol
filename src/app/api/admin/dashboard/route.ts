import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { requireOrgRole } from '@/lib/auth'
import { requireOrgRoleForSlug } from '@/lib/tenant-access'
import { MembershipRole } from '@/lib/membership-role'
import { assertSeasonInOrganization } from '@/lib/admin-season-route'
import { getAdminDashboardData } from '@/lib/admin-dashboard'

const getCachedDashboard = unstable_cache(
  async (organizationId: string, seasonId: string | null) =>
    getAdminDashboardData(organizationId, seasonId),
  ['admin-dashboard'],
  { revalidate: 30, tags: ['admin-dashboard'] },
)

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const organizationSlug = url.searchParams.get('org')
    const seasonId = url.searchParams.get('season')

    const { organizationId } = organizationSlug
      ? await requireOrgRoleForSlug(organizationSlug, [MembershipRole.ORG_ADMIN])
      : await requireOrgRole([MembershipRole.ORG_ADMIN])
    if (seasonId) {
      await assertSeasonInOrganization(seasonId, organizationId)
    }

    const data = await getCachedDashboard(organizationId, seasonId)
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
