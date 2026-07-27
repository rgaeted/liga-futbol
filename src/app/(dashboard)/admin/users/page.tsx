import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { UserForm } from '@/components/admin/UserForm'
import { UsersTable } from '@/components/admin/UsersTable'
import { resolveUserRoleTags } from '@/lib/user-roles-display'

export default async function AdminUsersPage() {
  const session = await auth()
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      coachedTeam: { select: { id: true } },
      friendlyPlayer: {
        select: {
          id: true,
          participations: { where: { isCoach: true }, select: { id: true }, take: 1 },
        },
      },
      player: { select: { teamId: true } },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
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
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          roleTags: resolveUserRoleTags({
            role: u.role,
            hasCoachedTeam: Boolean(u.coachedTeam),
            hasLeagueTeam: Boolean(u.player?.teamId),
            hasFriendlyProfile: Boolean(u.friendlyPlayer),
            isFriendlyCoach: Boolean(u.friendlyPlayer?.participations.length),
          }),
        }))}
        currentUserId={session!.user.id}
      />
    </div>
  )
}
