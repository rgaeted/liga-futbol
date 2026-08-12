import type { PrismaClient } from '@prisma/client'
import { MatchType, SeasonRosterStatus, SeasonTeamStatus } from '@prisma/client'
import { slugFromSeasonName } from '@/lib/validations/mobile-season'

export type SeasonEnrollmentSeedTeam = {
  teamId: string
  displayName: string
  color: string | null
  crestMimeType: string | null
  crestData: Uint8Array | null
  playerIds: string[]
}

export type SeasonEnrollmentSeed = {
  seasonId: string
  slug: string
  displayName: string
  teams: SeasonEnrollmentSeedTeam[]
}

type BuildInput = {
  seasonId: string
  seasonName: string
  teamsFromMatches: Array<{
    id: string
    name: string
    color: string | null
    crestMimeType: string | null
    crestData: Uint8Array | null
    players: Array<{ id: string }>
  }>
  callups: Array<{ teamId: string; playerId: string }>
}

export function buildSeasonEnrollmentSeed(input: BuildInput): SeasonEnrollmentSeed {
  const playerIdsByTeam = new Map<string, Set<string>>()

  for (const team of input.teamsFromMatches) {
    const set = new Set(team.players.map((p) => p.id))
    playerIdsByTeam.set(team.id, set)
  }

  for (const callup of input.callups) {
    if (!playerIdsByTeam.has(callup.teamId)) {
      playerIdsByTeam.set(callup.teamId, new Set())
    }
    playerIdsByTeam.get(callup.teamId)!.add(callup.playerId)
  }

  const teams = input.teamsFromMatches.map((team) => ({
    teamId: team.id,
    displayName: team.name,
    color: team.color,
    crestMimeType: team.crestMimeType,
    crestData: team.crestData,
    playerIds: [...(playerIdsByTeam.get(team.id) ?? new Set())],
  }))

  return {
    seasonId: input.seasonId,
    slug: slugFromSeasonName(input.seasonName),
    displayName: input.seasonName,
    teams,
  }
}

export type BackfillSummary = {
  seasonsProcessed: number
  teamsUpserted: number
  rosterEntriesUpserted: number
}

export async function backfillSeasonEnrollment(db: PrismaClient): Promise<BackfillSummary> {
  const summary: BackfillSummary = {
    seasonsProcessed: 0,
    teamsUpserted: 0,
    rosterEntriesUpserted: 0,
  }

  const seasons = await db.season.findMany({
    include: {
      mobileConfig: true,
      matches: {
        where: { matchType: MatchType.LEAGUE, seasonId: { not: null } },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          callUps: { select: { playerId: true, player: { select: { teamId: true } } } },
        },
      },
    },
  })

  for (const season of seasons) {
    const teamIds = new Set<string>()
    const callups: Array<{ teamId: string; playerId: string }> = []

    for (const match of season.matches) {
      if (match.homeTeamId) teamIds.add(match.homeTeamId)
      if (match.awayTeamId) teamIds.add(match.awayTeamId)
      for (const callup of match.callUps) {
        const teamId = callup.player.teamId
        if (teamId) callups.push({ teamId, playerId: callup.playerId })
      }
    }

    if (teamIds.size === 0) continue

    const teams = await db.team.findMany({
      where: { id: { in: [...teamIds] } },
      include: { players: { select: { id: true } } },
    })

    const seed = buildSeasonEnrollmentSeed({
      seasonId: season.id,
      seasonName: season.name,
      teamsFromMatches: teams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        crestMimeType: t.crestMimeType,
        crestData: t.crestData,
        players: t.players,
      })),
      callups,
    })

    if (!season.mobileConfig) {
      await db.seasonMobileConfig.create({
        data: {
          seasonId: season.id,
          slug: seed.slug,
          displayName: seed.displayName,
          isPublished: false,
        },
      })
    }

    for (const team of seed.teams) {
      const seasonTeam = await db.seasonTeam.upsert({
        where: { seasonId_teamId: { seasonId: season.id, teamId: team.teamId } },
        create: {
          seasonId: season.id,
          teamId: team.teamId,
          displayName: team.displayName,
          color: team.color,
          crestMimeType: team.crestMimeType,
          crestData: team.crestData ? Buffer.from(team.crestData) : undefined,
          status: SeasonTeamStatus.REGISTERED,
        },
        update: {
          displayName: team.displayName,
          color: team.color,
          crestMimeType: team.crestMimeType,
          crestData: team.crestData ? Buffer.from(team.crestData) : undefined,
        },
      })
      summary.teamsUpserted += 1

      for (const playerId of team.playerIds) {
        const player = await db.player.findUnique({
          where: { id: playerId },
          select: { jerseyNumber: true, position: true },
        })
        await db.seasonRosterEntry.upsert({
          where: {
            seasonTeamId_playerId: { seasonTeamId: seasonTeam.id, playerId },
          },
          create: {
            seasonTeamId: seasonTeam.id,
            playerId,
            jerseyNumber: player?.jerseyNumber ?? null,
            position: player?.position ?? null,
            status: SeasonRosterStatus.ACTIVE,
          },
          update: {
            jerseyNumber: player?.jerseyNumber ?? null,
            position: player?.position ?? null,
          },
        })
        summary.rosterEntriesUpserted += 1
      }
    }

    summary.seasonsProcessed += 1
  }

  return summary
}
