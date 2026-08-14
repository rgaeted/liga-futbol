import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RefereeShareInviteStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrganizationId } from '@/lib/tenant-access'
import { RefereeInvitesInbox } from '@/components/admin/RefereeInvitesInbox'
import { orgPath } from '@/lib/tenant-paths'

export default async function AdminRefereeInvitesPage({
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

  const invites = await db.refereeShareInvite.findMany({
    where: {
      OR: [{ toOrganizationId: organizationId }, { fromOrganizationId: organizationId }],
      status: {
        in: [
          RefereeShareInviteStatus.PENDING,
          RefereeShareInviteStatus.ACCEPTED,
          RefereeShareInviteStatus.DECLINED,
          RefereeShareInviteStatus.CANCELLED,
        ],
      },
    },
    include: {
      refereeUser: { select: { name: true } },
      fromOrganization: { select: { name: true } },
      toOrganization: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const received = invites
    .filter((invite) => invite.toOrganizationId === organizationId)
    .map((invite) => ({
      id: invite.id,
      status: invite.status,
      refereeName: invite.refereeUser.name,
      fromOrganization: invite.fromOrganization,
      toOrganization: invite.toOrganization,
      direction: 'received' as const,
    }))

  const sent = invites
    .filter((invite) => invite.fromOrganizationId === organizationId)
    .map((invite) => ({
      id: invite.id,
      status: invite.status,
      refereeName: invite.refereeUser.name,
      fromOrganization: invite.fromOrganization,
      toOrganization: invite.toOrganization,
      direction: 'sent' as const,
    }))

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={orgPath(organizationSlug, '/admin/referees')}
          className="font-ui text-sm text-kelme-red hover:underline"
        >
          ← Volver al directorio
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">Invitaciones de árbitros</h1>
        <p className="mt-1 text-sm text-kelme-gray-500">
          Acepta árbitros compartidos por otras ligas o revisa las invitaciones que enviaste.
        </p>
      </div>
      <RefereeInvitesInbox received={received} sent={sent} />
    </div>
  )
}
