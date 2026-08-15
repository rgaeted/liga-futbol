'use server'

import { syncActiveOrganizationCookie } from '@/lib/tenant-access'

export async function syncOrgCookieAction(organizationId: string) {
  if (!organizationId) return
  await syncActiveOrganizationCookie(organizationId)
}
