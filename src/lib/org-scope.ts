export function assertSameOrganization(resourceOrgId: string, sessionOrgId: string) {
  if (resourceOrgId !== sessionOrgId) {
    throw new Error('Forbidden')
  }
}
