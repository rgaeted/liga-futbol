import {
  MobileInstallationStatus,
  NotificationKind,
} from '@prisma/client'
import { db } from '@/lib/db'

export type FindSubscribedInstallationsInput = {
  seasonId: string
  seasonTeamIds: string[]
  kind: NotificationKind
}

export type NotificationRecipient = {
  installationId: string
  expoPushToken: string
}

function preferenceFilter(kind: NotificationKind) {
  if (kind === NotificationKind.MATCH_START) {
    return { notifyMatchStart: true }
  }
  if (kind === NotificationKind.GOAL) {
    return { notifyGoals: true }
  }
  return { notifyFinal: true }
}

export async function findSubscribedInstallations(
  input: FindSubscribedInstallationsInput,
): Promise<NotificationRecipient[]> {
  if (input.seasonTeamIds.length === 0) {
    return []
  }

  const subscriptions = await db.teamSubscription.findMany({
    where: {
      seasonTeamId: { in: input.seasonTeamIds },
      ...preferenceFilter(input.kind),
      installation: {
        seasonId: input.seasonId,
        status: MobileInstallationStatus.ACTIVE,
      },
    },
    select: {
      installationId: true,
      installation: {
        select: {
          id: true,
          expoPushToken: true,
        },
      },
    },
  })

  const recipients = new Map<string, NotificationRecipient>()
  for (const subscription of subscriptions) {
    recipients.set(subscription.installationId, {
      installationId: subscription.installation.id,
      expoPushToken: subscription.installation.expoPushToken,
    })
  }

  return [...recipients.values()]
}
