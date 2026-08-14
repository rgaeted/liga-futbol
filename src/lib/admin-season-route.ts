import { requireOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { assertSeasonInOrganization } from '@/lib/org-scope'

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
