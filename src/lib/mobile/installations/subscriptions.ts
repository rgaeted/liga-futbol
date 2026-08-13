import { MobileInstallationStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { MobileApiError } from '@/lib/mobile/errors'
import type { ReplaceSubscriptionsInput } from '@/lib/validations/mobile-installation'

export type ReplaceTeamSubscriptionsParams = {
  seasonId: string
  installationId: string
  teams: ReplaceSubscriptionsInput['teams']
}

function normalizeTeamPreferences(team: ReplaceSubscriptionsInput['teams'][number]) {
  return {
    seasonTeamId: team.seasonTeamId,
    notifyMatchStart: team.notifyMatchStart ?? true,
    notifyGoals: team.notifyGoals ?? true,
    notifyFinal: team.notifyFinal ?? true,
  }
}

export async function replaceTeamSubscriptions(params: ReplaceTeamSubscriptionsParams) {
  const installation = await db.mobileInstallation.findUnique({
    where: { id: params.installationId },
    select: { seasonId: true, status: true },
  })

  if (!installation || installation.seasonId !== params.seasonId) {
    throw new MobileApiError(404, 'Instalación no encontrada')
  }

  if (installation.status !== MobileInstallationStatus.ACTIVE) {
    throw new MobileApiError(400, 'Instalación inactiva')
  }

  const seasonTeamIds = params.teams.map((team) => team.seasonTeamId)
  const uniqueSeasonTeamIds = new Set(seasonTeamIds)
  if (uniqueSeasonTeamIds.size !== seasonTeamIds.length) {
    throw new MobileApiError(400, 'Equipos duplicados en la suscripción')
  }

  if (seasonTeamIds.length > 0) {
    const validCount = await db.seasonTeam.count({
      where: {
        id: { in: seasonTeamIds },
        seasonId: params.seasonId,
      },
    })
    if (validCount !== seasonTeamIds.length) {
      throw new MobileApiError(400, 'Uno o más equipos no pertenecen a esta edición')
    }
  }

  const normalizedTeams = params.teams.map(normalizeTeamPreferences)

  await db.$transaction(async (tx) => {
    await tx.teamSubscription.deleteMany({
      where: { installationId: params.installationId },
    })

    if (normalizedTeams.length > 0) {
      await tx.teamSubscription.createMany({
        data: normalizedTeams.map((team) => ({
          installationId: params.installationId,
          ...team,
        })),
      })
    }
  })

  return { teams: normalizedTeams }
}
