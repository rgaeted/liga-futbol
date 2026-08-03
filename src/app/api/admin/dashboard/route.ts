import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { getAdminDashboardData } from '@/lib/admin-dashboard'

const getCachedDashboard = unstable_cache(
  async (seasonId: string | null) => getAdminDashboardData(seasonId),
  ['admin-dashboard'],
  { revalidate: 30 }
)

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN])
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const seasonId = new URL(req.url).searchParams.get('season')

  try {
    const data = await getCachedDashboard(seasonId)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[admin/dashboard]', err)
    return NextResponse.json({ error: 'No se pudieron cargar los datos del panel' }, { status: 500 })
  }
}
