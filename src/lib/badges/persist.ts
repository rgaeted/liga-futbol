import 'server-only'

import { EventType, MatchStatus, MatchType } from '@prisma/client'
import { chileYear } from '@/lib/badges/context'
import { evaluarBadgesDePartido } from '@/lib/badges/evaluate'
import { BADGE_REGISTRY } from '@/lib/badges/registry'
import type { BadgeCatalogRow, BadgeEvent, BadgeHistory, BadgeMatch, BadgeRosterRow, BadgeSide } from '@/lib/badges/types'
import { db } from '@/lib/db'
import { isScoringGoalEvent } from '@/lib/event-labels'

type PersistEventRow = {
  id: string
  type: string
  minute: number
  playerId: string | null
  assistPlayerId: string | null
  side: BadgeSide | null
  teamId: string | null
}

type PersistMatchRow = {
  id: string
  organizationId: string
  scheduledAt: Date
  status: MatchStatus
  matchType: MatchType
  sideAName: string | null
  sideBName: string | null
  homeTeamId: string | null
  awayTeamId: string | null
  events: PersistEventRow[]
  friendlyPlayers: Array<{
    playerId: string
    side: BadgeSide
    player: { primaryPosition: string | null; position: string | null }
  }>
  callUps: Array<{
    playerId: string
    player: { primaryPosition: string | null; position: string | null; teamId: string | null }
  }>
  teamMvps: Array<{ playerId: string | null }>
}

const MATCH_BADGE_INCLUDE = {
  organization: { select: { badgesEnabled: true } },
  events: {
    select: {
      id: true,
      type: true,
      minute: true,
      playerId: true,
      assistPlayerId: true,
      side: true,
      teamId: true,
    },
    orderBy: [{ minute: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  friendlyPlayers: {
    select: {
      playerId: true,
      side: true,
      player: { select: { primaryPosition: true, position: true } },
    },
  },
  callUps: {
    select: {
      playerId: true,
      player: { select: { primaryPosition: true, position: true, teamId: true } },
    },
  },
  teamMvps: { select: { playerId: true } },
} as const

const HISTORY_MATCH_SELECT = {
  id: true,
  scheduledAt: true,
  matchType: true,
  homeTeamId: true,
  awayTeamId: true,
  events: {
    select: {
      id: true,
      type: true,
      minute: true,
      playerId: true,
      assistPlayerId: true,
      side: true,
      teamId: true,
    },
  },
  friendlyPlayers: {
    select: {
      playerId: true,
      side: true,
      player: { select: { primaryPosition: true, position: true } },
    },
  },
  callUps: {
    select: {
      playerId: true,
      player: { select: { primaryPosition: true, position: true, teamId: true } },
    },
  },
} as const

function eventSide(
  event: Pick<PersistEventRow, 'side' | 'teamId'>,
  matchType: MatchType,
  homeTeamId: string | null,
  awayTeamId: string | null,
): BadgeSide | null {
  if (event.side) return event.side
  if (matchType !== MatchType.LEAGUE || !event.teamId) return null
  if (event.teamId === homeTeamId) return 'A'
  if (event.teamId === awayTeamId) return 'B'
  return null
}

function buildRoster(match: PersistMatchRow): BadgeRosterRow[] {
  if (match.matchType === MatchType.FRIENDLY) {
    return match.friendlyPlayers.map((row) => ({
      playerId: row.playerId,
      side: row.side,
      primaryPosition: row.player.primaryPosition,
      position: row.player.position,
    }))
  }

  return match.callUps.map((row) => ({
    playerId: row.playerId,
    side: (row.player.teamId === match.homeTeamId ? 'A' : 'B') as BadgeSide,
    primaryPosition: row.player.primaryPosition,
    position: row.player.position,
  }))
}

function toBadgeEvents(match: PersistMatchRow): BadgeEvent[] {
  return match.events.map((event) => ({
    id: event.id,
    type: event.type,
    minute: event.minute,
    playerId: event.playerId,
    assistPlayerId: event.assistPlayerId,
    side: eventSide(event, match.matchType, match.homeTeamId, match.awayTeamId),
  }))
}

function buildBadgeMatch(match: PersistMatchRow): BadgeMatch {
  return {
    id: match.id,
    scheduledAt: match.scheduledAt,
    sideAName: match.sideAName,
    sideBName: match.sideBName,
    events: toBadgeEvents(match),
    roster: buildRoster(match),
    mvpPlayerIds: match.teamMvps
      .map((row) => row.playerId)
      .filter((playerId): playerId is string => playerId != null),
  }
}

function playerStatsInMatch(
  playerId: string,
  match: PersistMatchRow,
): {
  played: boolean
  goles: number
  asistencias: number
  amarillas: number
  rojas: number
} {
  const played = buildRoster(match).some((row) => row.playerId === playerId)
  let goles = 0
  let asistencias = 0
  let amarillas = 0
  let rojas = 0

  for (const event of match.events) {
    if (event.playerId === playerId) {
      if (isScoringGoalEvent(event.type as EventType)) goles += 1
      if (event.type === EventType.YELLOW_CARD) amarillas += 1
      if (event.type === EventType.RED_CARD) rojas += 1
    }
    if (
      event.assistPlayerId === playerId &&
      isScoringGoalEvent(event.type as EventType)
    ) {
      asistencias += 1
    }
  }

  return { played, goles, asistencias, amarillas, rojas }
}

function yearCardCount(
  playerId: string,
  year: number,
  priorMatches: PersistMatchRow[],
  currentMatch: PersistMatchRow,
): number {
  let cards = 0
  for (const match of priorMatches) {
    if (chileYear(match.scheduledAt) !== year) continue
    const stats = playerStatsInMatch(playerId, match)
    cards += stats.amarillas + stats.rojas
  }
  const currentStats = playerStatsInMatch(playerId, currentMatch)
  cards += currentStats.amarillas + currentStats.rojas
  return cards
}

function buildHistoryByPlayerId(
  currentMatch: PersistMatchRow,
  otherMatches: PersistMatchRow[],
  rosterPlayerIds: string[],
  playerBadges: Array<{
    playerId: string
    awardedAt: Date
    orgBadge: { predicateId: string }
  }>,
): Record<string, BadgeHistory> {
  const currentYear = chileYear(currentMatch.scheduledAt)
  const laterSameYearExists = otherMatches.some(
    (match) =>
      chileYear(match.scheduledAt) === currentYear &&
      match.scheduledAt.getTime() > currentMatch.scheduledAt.getTime(),
  )

  const priorRows = otherMatches
    .filter((match) => match.scheduledAt.getTime() < currentMatch.scheduledAt.getTime())
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())

  const historyByPlayerId: Record<string, BadgeHistory> = {}

  for (const playerId of rosterPlayerIds) {
    const priorMatches = priorRows.map((match) => ({
      id: match.id,
      scheduledAt: match.scheduledAt,
      ...playerStatsInMatch(playerId, match),
    }))

    const badges = playerBadges.filter((row) => row.playerId === playerId)
    const alreadyHasPredicateIds = [...new Set(badges.map((row) => row.orgBadge.predicateId))]
    const yearBadges = badges.filter((row) => chileYear(row.awardedAt) === currentYear)

    historyByPlayerId[playerId] = {
      priorMatches,
      alreadyHasPredicateIds,
      yearHasCaballero: yearBadges.some((row) => row.orgBadge.predicateId === 'caballero'),
      yearHasTarjetero: yearBadges.some((row) => row.orgBadge.predicateId === 'tarjetero'),
      laterSameYearExists,
    }
  }

  return historyByPlayerId
}

function catalogFromOrgBadges(
  orgBadges: Array<{
    predicateId: string
    thresholds: unknown
    isActive: boolean
  }>,
): BadgeCatalogRow[] {
  return orgBadges.map((row) => ({
    predicateId: row.predicateId,
    thresholds: row.thresholds as Record<string, number>,
    isActive: row.isActive,
  }))
}

export async function seedOrgBadgeCatalog(organizationId: string): Promise<void> {
  const count = await db.orgBadge.count({ where: { organizationId } })
  if (count > 0) return

  await db.orgBadge.createMany({
    data: BADGE_REGISTRY.map((definition, index) => ({
      organizationId,
      predicateId: definition.predicateId,
      name: definition.name,
      description: definition.description,
      family: definition.family,
      rarity: definition.rarity,
      iconKey: definition.iconKey,
      thresholds: definition.defaultThresholds,
      isActive: true,
      sortOrder: index,
    })),
  })
}

export async function setOrgBadgesEnabled(
  organizationId: string,
  enabled: boolean,
): Promise<void> {
  await db.organization.update({
    where: { id: organizationId },
    data: { badgesEnabled: enabled },
  })

  if (enabled) {
    await seedOrgBadgeCatalog(organizationId)
    await backfillOrgBadges(organizationId)
  }
}

export async function backfillOrgBadges(organizationId: string): Promise<void> {
  const matches = await db.match.findMany({
    where: { organizationId, status: MatchStatus.FINISHED },
    orderBy: { scheduledAt: 'asc' },
    select: { id: true },
  })

  for (const match of matches) {
    await syncBadgesForFinishedMatch(match.id)
  }
}

async function deleteCaballeroBadgesForYear(
  organizationId: string,
  playerId: string,
  year: number,
  caballeroOrgBadgeId: string,
): Promise<void> {
  const existing = await db.playerBadge.findMany({
    where: { organizationId, playerId, orgBadgeId: caballeroOrgBadgeId },
    select: { id: true, awardedAt: true },
  })

  const ids = existing
    .filter((row) => chileYear(row.awardedAt) === year)
    .map((row) => row.id)

  if (ids.length === 0) return

  await db.playerBadge.deleteMany({ where: { id: { in: ids } } })
}

export async function syncBadgesForFinishedMatch(matchId: string): Promise<void> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      organizationId: true,
      status: true,
      scheduledAt: true,
      matchType: true,
      sideAName: true,
      sideBName: true,
      homeTeamId: true,
      awayTeamId: true,
      ...MATCH_BADGE_INCLUDE,
    },
  })

  if (!match?.organization.badgesEnabled || match.status !== MatchStatus.FINISHED) {
    return
  }

  const persistMatch = match as PersistMatchRow
  const badgeMatch = buildBadgeMatch(persistMatch)
  const rosterPlayerIds = badgeMatch.roster.map((row) => row.playerId)

  const [orgBadges, otherMatches] = await Promise.all([
    db.orgBadge.findMany({
      where: { organizationId: match.organizationId },
      select: { id: true, predicateId: true, thresholds: true, isActive: true },
    }),
    db.match.findMany({
      where: {
        organizationId: match.organizationId,
        status: MatchStatus.FINISHED,
        id: { not: matchId },
      },
      orderBy: { scheduledAt: 'asc' },
      select: HISTORY_MATCH_SELECT,
    }),
  ])

  await db.playerBadge.deleteMany({ where: { matchId } })

  const caballeroOrgBadge = orgBadges.find((row) => row.predicateId === 'caballero')
  const currentYear = chileYear(match.scheduledAt)
  const priorMatches = otherMatches.filter(
    (row) => row.scheduledAt.getTime() < match.scheduledAt.getTime(),
  ) as PersistMatchRow[]

  if (caballeroOrgBadge) {
    for (const playerId of rosterPlayerIds) {
      const cards = yearCardCount(playerId, currentYear, priorMatches, persistMatch)
      if (cards > 0) {
        await deleteCaballeroBadgesForYear(
          match.organizationId,
          playerId,
          currentYear,
          caballeroOrgBadge.id,
        )
      }
    }
  }

  const playerBadges =
    rosterPlayerIds.length === 0
      ? []
      : await db.playerBadge.findMany({
          where: {
            organizationId: match.organizationId,
            playerId: { in: rosterPlayerIds },
            matchId: { not: matchId },
          },
          select: {
            playerId: true,
            awardedAt: true,
            orgBadge: { select: { predicateId: true } },
          },
        })

  const historyByPlayerId = buildHistoryByPlayerId(
    persistMatch,
    otherMatches as PersistMatchRow[],
    rosterPlayerIds,
    playerBadges,
  )

  const awards = evaluarBadgesDePartido(
    badgeMatch,
    catalogFromOrgBadges(orgBadges),
    historyByPlayerId,
  )

  if (awards.length === 0) return

  const orgBadgeByPredicateId = new Map(orgBadges.map((row) => [row.predicateId, row.id]))

  await db.playerBadge.createMany({
    data: awards
      .map((award) => {
        const orgBadgeId = orgBadgeByPredicateId.get(award.predicateId)
        if (!orgBadgeId) return null
        return {
          organizationId: match.organizationId,
          playerId: award.playerId,
          orgBadgeId,
          matchId,
          context: award.context,
          awardedAt: match.scheduledAt,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null),
    skipDuplicates: true,
  })
}
