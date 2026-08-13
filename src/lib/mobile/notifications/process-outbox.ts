import {
  MobileInstallationStatus,
  NotificationDeliveryStatus,
  NotificationOutboxStatus,
  SeasonTeamStatus,
  type NotificationOutbox,
} from '@prisma/client'
import { db } from '@/lib/db'
import { claimPendingOutbox } from '@/lib/mobile/notifications/claim-outbox'
import { sendExpoPush } from '@/lib/mobile/notifications/expo-push'
import { findSubscribedInstallations } from '@/lib/mobile/notifications/recipients'
import type { MatchNotificationPayload } from '@/lib/mobile/notifications/types'

const MAX_OUTBOX_ATTEMPTS = 8

export function computeOutboxRetryDelayMs(attempts: number): number {
  return Math.min(2 ** attempts * 30_000, 3_600_000)
}

export function computeOutboxNextRetryAt(attempts: number, now: Date): Date {
  return new Date(now.getTime() + computeOutboxRetryDelayMs(attempts))
}

function parseStoredPayload(payload: unknown): MatchNotificationPayload {
  const record = payload as MatchNotificationPayload
  return {
    title: record.title,
    body: record.body,
    data: record.data,
  }
}

async function resolveTargetSeasonTeamIds(outbox: NotificationOutbox): Promise<string[]> {
  if (outbox.seasonTeamId) {
    return [outbox.seasonTeamId]
  }

  const match = await db.match.findUnique({
    where: { id: outbox.matchId },
    select: { homeTeamId: true, awayTeamId: true, seasonId: true },
  })

  if (!match?.seasonId || !match.homeTeamId || !match.awayTeamId) {
    return []
  }

  const seasonTeams = await db.seasonTeam.findMany({
    where: {
      seasonId: match.seasonId,
      teamId: { in: [match.homeTeamId, match.awayTeamId] },
      status: SeasonTeamStatus.REGISTERED,
    },
    select: { id: true },
  })

  return seasonTeams.map((seasonTeam) => seasonTeam.id)
}

async function ensurePendingDeliveries(
  outboxId: string,
  recipients: Awaited<ReturnType<typeof findSubscribedInstallations>>,
) {
  if (recipients.length === 0) {
    return []
  }

  await db.notificationDelivery.createMany({
    data: recipients.map((recipient) => ({
      outboxId,
      installationId: recipient.installationId,
      status: NotificationDeliveryStatus.PENDING,
    })),
    skipDuplicates: true,
  })

  return db.notificationDelivery.findMany({
    where: {
      outboxId,
      status: NotificationDeliveryStatus.PENDING,
    },
    include: {
      installation: {
        select: { expoPushToken: true },
      },
    },
  })
}

async function markOutboxSent(outboxId: string) {
  await db.notificationOutbox.update({
    where: { id: outboxId },
    data: {
      status: NotificationOutboxStatus.SENT,
      lastError: null,
      nextRetryAt: null,
    },
  })
}

async function scheduleOutboxRetry(
  outbox: NotificationOutbox,
  errorMessage: string,
  now: Date,
) {
  const attempts = outbox.attempts + 1
  await db.notificationOutbox.update({
    where: { id: outbox.id },
    data: {
      status: NotificationOutboxStatus.FAILED,
      attempts,
      lastError: errorMessage,
      nextRetryAt:
        attempts >= MAX_OUTBOX_ATTEMPTS ? null : computeOutboxNextRetryAt(attempts, now),
    },
  })
}

function isDeviceNotRegistered(message: string | undefined, detailsError: string | undefined) {
  return message === 'DeviceNotRegistered' || detailsError === 'DeviceNotRegistered'
}

export async function processOutboxItem(outbox: NotificationOutbox, now = new Date()) {
  const payload = parseStoredPayload(outbox.payload)
  const seasonTeamIds = await resolveTargetSeasonTeamIds(outbox)
  const recipients = await findSubscribedInstallations({
    seasonId: outbox.seasonId,
    seasonTeamIds,
    kind: outbox.kind,
  })

  if (recipients.length === 0) {
    await markOutboxSent(outbox.id)
    return
  }

  const pendingDeliveries = await ensurePendingDeliveries(outbox.id, recipients)
  if (pendingDeliveries.length === 0) {
    await markOutboxSent(outbox.id)
    return
  }

  const messages = pendingDeliveries.map((delivery) => ({
    to: delivery.installation.expoPushToken,
    title: payload.title,
    body: payload.body,
    data: payload.data,
  }))

  let tickets
  try {
    tickets = await sendExpoPush(messages)
  } catch (error) {
    await scheduleOutboxRetry(
      outbox,
      error instanceof Error ? error.message : 'Expo push failed',
      now,
    )
    return
  }

  let requiresOutboxRetry = false

  for (const [index, delivery] of pendingDeliveries.entries()) {
    const ticket = tickets[index]
    if (!ticket) {
      requiresOutboxRetry = true
      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          lastError: 'Missing Expo ticket',
        },
      })
      continue
    }

    if (ticket.status === 'ok') {
      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          expoTicketId: ticket.id ?? null,
          lastError: null,
        },
      })
      continue
    }

    if (isDeviceNotRegistered(ticket.message, ticket.details?.error)) {
      await db.$transaction([
        db.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.INVALID_TOKEN,
            lastError: 'DeviceNotRegistered',
          },
        }),
        db.mobileInstallation.update({
          where: { id: delivery.installationId },
          data: { status: MobileInstallationStatus.INACTIVE },
        }),
      ])
      continue
    }

    requiresOutboxRetry = true
    await db.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: NotificationDeliveryStatus.FAILED,
        lastError: ticket.message ?? ticket.details?.error ?? 'Expo push error',
      },
    })
  }

  if (requiresOutboxRetry) {
    await scheduleOutboxRetry(outbox, 'One or more deliveries failed', now)
    return
  }

  await markOutboxSent(outbox.id)
}

export async function processPendingNotifications({
  limit = 20,
  now = new Date(),
}: {
  limit?: number
  now?: Date
} = {}) {
  const claimed = await claimPendingOutbox(limit, now)
  for (const outbox of claimed) {
    await processOutboxItem(outbox, now)
  }
  return { processed: claimed.length }
}
