import { requireOrgRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { assertSameOrganization } from '@/lib/org-scope'

export async function assertSeasonInOrganization(seasonId: string, organizationId: string) {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    select: { organizationId: true },
  })
  if (!season) {
    throw new Error('NotFound')
  }
  assertSameOrganization(season.organizationId, organizationId)
}

export async function requireAdminSeason(seasonId: string) {
  const ctx = await requireOrgRole([MembershipRole.ORG_ADMIN])
  await assertSeasonInOrganization(seasonId, ctx.organizationId)
  return ctx
}

export function mapAdminSeasonRouteError(error: unknown): { message: string; status: number } | null {
  if (error instanceof Error && error.message === 'NotFound') {
    return { message: 'Temporada no encontrada', status: 404 }
  }
  if (error instanceof Error && error.message === 'Forbidden') {
    return { message: 'No autorizado.', status: 403 }
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return { message: 'No autorizado.', status: 401 }
  }
  return null
}
