import {
  assertCanCreateTeam,
  assertOrgCapability,
  type Capability,
} from '@/lib/billing/capabilities'
import { db } from '@/lib/db'

export async function enforceCreateTeam(organizationId: string) {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { plan: true },
  })
  const currentTeamCount = await db.team.count({ where: { organizationId } })
  return assertCanCreateTeam({ plan: org.plan, currentTeamCount })
}

export async function enforceCapability(
  organizationId: string,
  capability: Capability,
) {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { plan: true },
  })
  return assertOrgCapability(org.plan, capability)
}

export async function enforceCreateMatch(
  organizationId: string,
  matchType: 'LEAGUE' | 'FRIENDLY',
) {
  return enforceCapability(
    organizationId,
    matchType === 'LEAGUE' ? 'MANAGE_LEAGUE_MATCHES' : 'MANAGE_FRIENDLIES',
  )
}
