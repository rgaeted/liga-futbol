export function pausedOrganizationPayload() {
  return { error: 'Organización no disponible' as const }
}

export const PAUSED_ORGANIZATION_STATUS = 503 as const
