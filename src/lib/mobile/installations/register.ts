import { MobileInstallationStatus, type MobilePlatform } from '@prisma/client'
import { db } from '@/lib/db'
import { MobileApiError } from '@/lib/mobile/errors'

export type RegisterInstallationParams = {
  seasonId: string
  installationId: string
  expoPushToken: string
  platform: MobilePlatform
  appVersion?: string
  now?: Date
}

export async function registerInstallation(params: RegisterInstallationParams) {
  const now = params.now ?? new Date()
  const existing = await db.mobileInstallation.findUnique({
    where: { id: params.installationId },
    select: { seasonId: true },
  })

  if (existing && existing.seasonId !== params.seasonId) {
    throw new MobileApiError(400, 'Esta instalación ya está registrada en otra edición')
  }

  const installation = await db.mobileInstallation.upsert({
    where: { id: params.installationId },
    create: {
      id: params.installationId,
      seasonId: params.seasonId,
      expoPushToken: params.expoPushToken,
      platform: params.platform,
      appVersion: params.appVersion ?? null,
      status: MobileInstallationStatus.ACTIVE,
      lastSeenAt: now,
    },
    update: {
      expoPushToken: params.expoPushToken,
      platform: params.platform,
      appVersion: params.appVersion ?? null,
      status: MobileInstallationStatus.ACTIVE,
      lastSeenAt: now,
    },
  })

  return {
    installationId: installation.id,
    status: installation.status,
  }
}
