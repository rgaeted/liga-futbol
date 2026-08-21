export type MobileStandingRow = {
  rank: number
  seasonTeamId: string
  teamId: string
  name: string
  color: string
  crestUrl: string | null
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  dg: number
  pts: number
}

export type MobileStandingCategory = {
  categoryId: string
  name: string
  rows: MobileStandingRow[]
}

export type MobileStandingsResponse = {
  categories: MobileStandingCategory[]
  rows: MobileStandingRow[]
}
