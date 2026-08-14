export function assertSameOrganization(resourceOrgId: string, sessionOrgId: string) {
  if (resourceOrgId !== sessionOrgId) {
    throw new Error('Forbidden')
  }
}

export { pausedOrganizationPayload, PAUSED_ORGANIZATION_STATUS } from '@/lib/organization-status'
