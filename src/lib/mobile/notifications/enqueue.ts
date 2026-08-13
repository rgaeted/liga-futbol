import {
  EventType,
  MatchType,
  NotificationKind,
  Prisma,
  SeasonTeamStatus,
} from '@prisma/client'
import { db } from '@/lib/db'
import { buildNotificationDedupeKey } from '@/lib/mobile/notifications/dedupe-key'
import { buildMatchNotificationPayload } from '@/lib/mobile/notifications/payload'
import { resolveScoringTeamId } from '@/lib/mobile/notifications/scoring-team'

export type EnqueueMatchNotificationInput = {
  kind: NotificationKind
  match: {
    id: string
    matchType: MatchType
    seasonId: string | null
    homeTeamId: string | null
    awayTeamId: string | null
    homeScore: number
    awayScore: number
  }
  matchEvent?: {
    id: string
    type: 'GOAL' | 'OWN_GOAL'
    teamId: string | null
    playerName?: string | null
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function enqueueMatchNotification(
  input: EnqueueMatchNotificationInput,
): Promise<{ enqueued: boolean; outboxId?: string }> {
  if (input.match.matchType !== MatchType.LEAGUE || !input.match.seasonId) {
    return { enqueued: false }
  }

  const season = await db.season.findUnique({
    where: { id: input.match.seasonId },
    include: {
      mobileConfig: true,
      seasonTeams: {
        where: { status: SeasonTeamStatus.REGISTERED },
        select: { id: true, teamId: true, displayName: true },
      },
    },
  })

  if (!season?.mobileConfig?.isPublished) {
    return { enqueued: false }
  }

  const homeSeasonTeam = season.seasonTeams.find(
    (seasonTeam) => seasonTeam.teamId === input.match.homeTeamId,
  )
  const awaySeasonTeam = season.seasonTeams.find(
    (seasonTeam) => seasonTeam.teamId === input.match.awayTeamId,
  )

  if (!homeSeasonTeam || !awaySeasonTeam) {
    return { enqueued: false }
  }

  let seasonTeamId: string | null = null
  if (input.kind === NotificationKind.GOAL) {
    if (!input.matchEvent) {
      return { enqueued: false }
    }

    seasonTeamId = resolveScoringTeamId(
      {
        homeTeamId: input.match.homeTeamId,
        awayTeamId: input.match.awayTeamId,
        homeSeasonTeamId: homeSeasonTeam.id,
        awaySeasonTeamId: awaySeasonTeam.id,
      },
      {
        type: input.matchEvent.type === EventType.OWN_GOAL ? 'OWN_GOAL' : 'GOAL',
        teamId: input.matchEvent.teamId,
      },
    )

    if (!seasonTeamId) {
      return { enqueued: false }
    }
  }

  const payload = buildMatchNotificationPayload(input.kind, {
    slug: season.mobileConfig.slug,
    matchId: input.match.id,
    homeName: homeSeasonTeam.displayName,
    awayName: awaySeasonTeam.displayName,
    homeScore: input.match.homeScore,
    awayScore: input.match.awayScore,
    scorerName: input.matchEvent?.playerName ?? null,
  })

  const dedupeKey = buildNotificationDedupeKey({
    seasonId: input.match.seasonId,
    matchId: input.match.id,
    kind: input.kind,
    matchEventId: input.matchEvent?.id,
  })

  try {
    const outbox = await db.notificationOutbox.create({
      data: {
        seasonId: input.match.seasonId,
        matchId: input.match.id,
        kind: input.kind,
        seasonTeamId,
        matchEventId: input.matchEvent?.id ?? null,
        payload,
        dedupeKey,
      },
    })
    return { enqueued: true, outboxId: outbox.id }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { enqueued: false }
    }
    throw error
  }
}

export async function safeEnqueueMatchNotification(
  input: EnqueueMatchNotificationInput,
): Promise<void> {
  try {
    await enqueueMatchNotification(input)
  } catch (error) {
    console.warn('mobile_notification_enqueue_failed', {
      matchId: input.match.id,
      kind: input.kind,
      reason: error instanceof Error ? error.name : 'unknown_error',
    })
  }
}
