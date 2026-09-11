export type BadgeFamily =
  | 'clutch'
  | 'goleador'
  | 'creador'
  | 'muralla'
  | 'constancia'
  | 'camarin'
  | 'hitos'

export type BadgeRarity = 'comun' | 'raro' | 'epico' | 'legendario'
export type BadgeScope = 'match' | 'career' | 'year'
export type BadgeSide = 'A' | 'B'

export type BadgeEvent = {
  id: string
  type: string
  minute: number
  playerId: string | null
  assistPlayerId: string | null
  side: BadgeSide | null
}

export type BadgeRosterRow = {
  playerId: string
  side: BadgeSide
  primaryPosition?: string | null
  position?: string | null
}

export type BadgeMatch = {
  id: string
  scheduledAt: Date
  sideAName: string | null
  sideBName: string | null
  events: BadgeEvent[]
  roster: BadgeRosterRow[]
  mvpPlayerIds: string[]
}

export type BadgeHistory = {
  priorMatches: Array<{
    id: string
    scheduledAt: Date
    played: boolean
    goles: number
    asistencias: number
    amarillas: number
    rojas: number
  }>
  alreadyHasPredicateIds: string[]
  yearHasCaballero: boolean
  yearHasTarjetero: boolean
  laterSameYearExists: boolean
}

export type BadgeCatalogRow = {
  predicateId: string
  thresholds: Record<string, number>
  isActive: boolean
}

export type BadgeAward = {
  predicateId: string
  playerId: string
  context: string
}

export type BadgeDefinition = {
  predicateId: string
  name: string
  description: string
  family: BadgeFamily
  rarity: BadgeRarity
  iconKey: string
  evaluable: boolean
  repeatable: boolean
  scope: BadgeScope
  defaultThresholds: Record<string, number>
}
