import { NextResponse } from 'next/server'
import { requireOrgRoleForSlug } from '@/lib/tenant-access'
import { MembershipRole } from '@/lib/membership-role'
import { getOrgAnalyticsDashboard } from '@/lib/admin-analytics'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const organizationSlug = url.searchParams.get('org')
    const period = url.searchParams.get('period')

    if (!organizationSlug) {
      return NextResponse.json({ error: 'Organización requerida' }, { status: 400 })
    }

    const { organizationId } = await requireOrgRoleForSlug(organizationSlug, [
      MembershipRole.ORG_ADMIN,
    ])

    const data = await getOrgAnalyticsDashboard(organizationId, period)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'Forbidden') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    console.error('[admin/analytics]', err)
    return NextResponse.json(
      { error: 'No se pudieron cargar las estadísticas' },
      { status: 500 },
    )
  }
}
