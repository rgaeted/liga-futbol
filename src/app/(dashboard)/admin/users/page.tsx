import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { Role } from '@prisma/client'
import { UserForm } from '@/components/admin/UserForm'
import { UsersTable } from '@/components/admin/UsersTable'

export default async function AdminUsersPage() {
  const session = await auth()
  const users = await db.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.COACH, Role.REFEREE] } },
    select: { id: true, email: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Usuarios</h1>
      <p className="text-sm text-kelme-gray-400">
        Admins, DTs y árbitros. Los jugadores se gestionan desde la sección Jugadores.
      </p>
      <UserForm />
      <UsersTable users={users} currentUserId={session!.user.id} />
    </div>
  )
}
