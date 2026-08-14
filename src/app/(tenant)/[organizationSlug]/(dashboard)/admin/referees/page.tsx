import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RefereeShareInviteStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { refereeListUserInclude, serializeRefereeListItem } from '@/lib/referees'
import { requireOrganizationId } from '@/lib/tenant-access'
import { RefereesDirectory } from '@/components/admin/RefereesDirectory'
import { orgPath } from '@/lib/tenant-paths'

export default async function AdminRefereesPage({
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

  const [memberships, pendingReceived] = await Promise.all([
    db.organizationMembership.findMany({
      where: { organizationId, role: MembershipRole.REFEREE },
      include: {
        user: {
          include: refereeListUserInclude(organizationId),
        },
      },
      orderBy: { user: { name: 'asc' } },
    }),
    db.refereeShareInvite.findMany({
      where: {
        toOrganizationId: organizationId,
        status: RefereeShareInviteStatus.PENDING,
      },
      include: {
        refereeUser: { select: { name: true } },
        fromOrganization: { select: { name: true, slug: true } },
        toOrganization: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Árbitros</h1>
        <p className="mt-1 text-sm text-kelme-gray-500">
          Directorio de contacto y acceso para asignar partidos en tu liga.
        </p>
      </div>
      <RefereesDirectory
        referees={memberships.map((m) => serializeRefereeListItem({ user: m.user }))}
        pendingReceived={pendingReceived.map((invite) => ({
          id: invite.id,
          status: invite.status,
          refereeName: invite.refereeUser.name,
          fromOrganization: invite.fromOrganization,
          toOrganization: invite.toOrganization,
          direction: 'received' as const,
        }))}
      />
      <p className="font-ui text-sm text-kelme-gray-500">
        <Link href={orgPath(organizationSlug, '/admin/referees/invites')} className="text-kelme-red hover:underline">
          Gestionar invitaciones
        </Link>
      </p>
    </div>
  )
}
