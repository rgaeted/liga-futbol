import { BILLING_PLAN_LABELS, LEAGUE_TEAM_LIMIT, type BillingPlan } from '@/lib/billing/plans'

export type Capability =
  | 'VIEW_PUBLIC'
  | 'PLAY'
  | 'MANAGE_USERS'
  | 'MANAGE_TEAMS'
  | 'MANAGE_FRIENDLIES'
  | 'MANAGE_SEASONS'
  | 'MANAGE_LEAGUE_MATCHES'
  | 'MANAGE_LEAGUE_CONTENT'
  | 'PUBLISH_ORG_LANDING'
  | 'PUBLISH_TEAM_PAGES'

export { LEAGUE_TEAM_LIMIT, type BillingPlan, BILLING_PLAN_LABELS }

const PLAN_CAPABILITIES: Record<BillingPlan, readonly Capability[]> = {
  FREE: ['VIEW_PUBLIC', 'PLAY'],
  CLUB: [
    'VIEW_PUBLIC',
    'PLAY',
    'MANAGE_USERS',
    'MANAGE_TEAMS',
    'MANAGE_FRIENDLIES',
    'PUBLISH_ORG_LANDING',
  ],
  LEAGUE: [
    'VIEW_PUBLIC',
    'PLAY',
    'MANAGE_USERS',
    'MANAGE_TEAMS',
    'MANAGE_FRIENDLIES',
    'MANAGE_SEASONS',
    'MANAGE_LEAGUE_MATCHES',
    'MANAGE_LEAGUE_CONTENT',
    'PUBLISH_ORG_LANDING',
    'PUBLISH_TEAM_PAGES',
  ],
}

export function planHasCapability(plan: BillingPlan, capability: Capability): boolean {
  return PLAN_CAPABILITIES[plan].includes(capability)
}

export function assertOrgCapability(
  plan: BillingPlan,
  capability: Capability,
): { ok: true } | { ok: false; error: string } {
  if (planHasCapability(plan, capability)) return { ok: true }
  return {
    ok: false,
    error: 'Tu plan no incluye esto. Pasa a Club o Liga para desbloquearlo.',
  }
}

export function assertCanCreateTeam(input: {
  plan: BillingPlan
  currentTeamCount: number
}): { ok: true } | { ok: false; error: string } {
  const allowed = assertOrgCapability(input.plan, 'MANAGE_TEAMS')
  if (!allowed.ok) return allowed
  if (input.plan === 'LEAGUE' && input.currentTeamCount >= LEAGUE_TEAM_LIMIT) {
    return { ok: false, error: 'El plan Liga permite hasta 50 equipos.' }
  }
  return { ok: true }
}
