import { assertCanCreateTeam } from '@/lib/billing/capabilities'
import { db } from '@/lib/db'

export async function enforceCreateTeam(organizationId: string) {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { plan: true },
  })
  const currentTeamCount = await db.team.count({ where: { organizationId } })
  return assertCanCreateTeam({ plan: org.plan, currentTeamCount })
}
