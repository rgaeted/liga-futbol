export const BILLING_PLANS = ['FREE', 'CLUB', 'LEAGUE'] as const
export type BillingPlan = (typeof BILLING_PLANS)[number]
export const LEAGUE_TEAM_LIMIT = 50

export const BILLING_PLAN_LABELS: Record<BillingPlan, string> = {
  FREE: 'Gratis',
  CLUB: 'Club',
  LEAGUE: 'Liga',
}
