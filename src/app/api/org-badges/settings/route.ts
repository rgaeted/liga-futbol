import { NextResponse } from 'next/server'
import { setOrgBadgesEnabled } from '@/lib/badges/persist'
import { requireOrgRole } from '@/lib/auth'
import { enforceCapability } from '@/lib/billing/enforce'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { orgBadgeSettingsSchema } from '@/lib/validations/org-badge'

export async function PATCH(req: Request) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const gate = await enforceCapability(organizationId, 'MANAGE_LEAGUE_CONTENT')
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 })
  }
  const parsed = orgBadgeSettingsSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await setOrgBadgesEnabled(organizationId, parsed.data.badgesEnabled)

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { badgesEnabled: true },
  })

  return NextResponse.json({ badgesEnabled: organization.badgesEnabled })
}
