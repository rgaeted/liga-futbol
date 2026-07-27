import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { UserForm } from '@/components/admin/UserForm'
import { UsersTable } from '@/components/admin/UsersTable'

export default async function AdminUsersPage() {
  const session = await auth()
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      friendlyPlayer: { select: { id: true } },
      player: { select: { teamId: true } },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Usuarios</h1>
      <p className="text-sm text-kelme-gray-400">
        Todas las cuentas con acceso a la plataforma: staff (admin, DT, árbitro) y jugadores
        (liga o amistosos). El perfil deportivo se gestiona en Jugadores o Jugadores amistosos.
      </p>
      <UserForm />
      <UsersTable
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          isFriendlyPlayer: Boolean(u.friendlyPlayer),
          isLeaguePlayer: Boolean(u.player?.teamId),
        }))}
        currentUserId={session!.user.id}
      />
    </div>
  )
}
