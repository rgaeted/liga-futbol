import { db } from '@/lib/db'

export function assertSameOrganization(resourceOrgId: string, sessionOrgId: string) {
  if (resourceOrgId !== sessionOrgId) {
    throw new Error('Forbidden')
  }
}

export { pausedOrganizationPayload, PAUSED_ORGANIZATION_STATUS } from '@/lib/organization-status'

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
