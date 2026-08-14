import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { requireOrganizationId } from '@/lib/tenant-access'
import { UserForm } from '@/components/admin/UserForm'
import { UsersTable } from '@/components/admin/UsersTable'
import { resolveUserRoleTags } from '@/lib/user-roles-display'
import { auth } from '@/lib/auth'

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const session = await auth()
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const memberships = await db.organizationMembership.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          coachedTeam: { select: { id: true } },
          person: {
            select: {
              players: {
                where: { organizationId },
                select: { teamId: true },
                take: 1,
              },
              friendlyPlayers: {
                where: { organizationId },
                select: {
                  id: true,
                  participations: { where: { isCoach: true }, select: { id: true }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Usuarios</h1>
      <p className="text-sm text-kelme-gray-400">
        Todas las cuentas con acceso a la plataforma. Si alguien acumula varios roles, se listan
        todos; el más permisivo (menos restrictivo) aparece destacado en rojo.
      </p>
      <UserForm />
      <UsersTable
        users={memberships.map((m) => ({
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
          roleTags: resolveUserRoleTags({
            role: m.role,
            hasCoachedTeam: Boolean(m.user.coachedTeam),
            hasLeagueTeam: Boolean(m.user.person?.players[0]?.teamId),
            hasFriendlyProfile: Boolean(m.user.person?.friendlyPlayers.length),
            isFriendlyCoach: Boolean(
              m.user.person?.friendlyPlayers.some((fp) => fp.participations.length),
            ),
          }),
        }))}
        currentUserId={session!.user.id}
      />
    </div>
  )
}
