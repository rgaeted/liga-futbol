export const BILLING_PLANS = ['FREE', 'CLUB', 'LEAGUE'] as const
export type BillingPlan = (typeof BILLING_PLANS)[number]
export const LEAGUE_TEAM_LIMIT = 50

export const BILLING_PLAN_LABELS: Record<BillingPlan, string> = {
  FREE: 'Gratis',
  CLUB: 'Club',
  LEAGUE: 'Liga',
}

export const BILLING_PLAN_HIGHLIGHTS: Record<BillingPlan, readonly string[]> = {
  FREE: ['Ver partidos y marcador en vivo', 'Anotarte y jugar como jugador', 'Panel de jugador, DT y árbitro'],
  CLUB: [
    'Equipos y categorías amistosas',
    'Partidos y desafíos entre clubes',
    'Landing pública de tu organización',
  ],
  LEAGUE: [
    'Temporadas y fixture oficial',
    'Contenido, premios e insignias de liga',
    `Hasta ${LEAGUE_TEAM_LIMIT} equipos con página propia (próximamente)`,
  ],
}
