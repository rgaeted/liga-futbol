import { MobileInstallationStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { MobileApiError } from '@/lib/mobile/errors'

export async function deactivateInstallation(seasonId: string, installationId: string) {
  const installation = await db.mobileInstallation.findUnique({
    where: { id: installationId },
    select: { seasonId: true },
  })

  if (!installation || installation.seasonId !== seasonId) {
    throw new MobileApiError(404, 'Instalación no encontrada')
  }

  await db.mobileInstallation.update({
    where: { id: installationId },
    data: { status: MobileInstallationStatus.INACTIVE },
  })
}
