import { notFound } from 'next/navigation'
import { ChallengeStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrganizationId } from '@/lib/tenant-access'
import { ChallengeInbox } from '@/components/admin/ChallengeInbox'

export default async function AdminChallengesPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const items = await db.match.findMany({
    where: {
      OR: [
        {
          organizationId,
          guestOrganizationId: { not: null },
          challengeStatus: { in: [ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED] },
        },
        {
          guestOrganizationId: organizationId,
          challengeStatus: { in: [ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED] },
        },
      ],
    },
    include: {
      organization: { select: { id: true, slug: true, name: true } },
      guestOrganization: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Desafíos</h1>
        <p className="mt-1 text-sm text-kelme-gray-500">
          Acepta invitaciones o revisa los desafíos que enviaste a otras ligas.
        </p>
      </div>
      <ChallengeInbox
        organizationId={organizationId}
        items={items.map((item) => ({
          id: item.id,
          challengeStatus: item.challengeStatus,
          sideAName: item.sideAName,
          sideBName: item.sideBName,
          scheduledAt: item.scheduledAt.toISOString(),
          organization: item.organization,
          guestOrganization: item.guestOrganization,
        }))}
      />
    </div>
  )
}
