import { db } from '@/lib/db'
import { FriendlyPlayerForm } from '@/components/admin/FriendlyPlayerForm'
import { FriendlyPlayersTable } from '@/components/admin/FriendlyPlayersTable'

export default async function AdminFriendlyPlayersPage() {
  const players = await db.friendlyPlayer.findMany({
    include: { user: { select: { email: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Jugadores amistosos</h1>
      <FriendlyPlayerForm />
      <FriendlyPlayersTable
        players={players.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.user?.email ?? null,
          dominantFoot: p.dominantFoot,
          primaryPosition: p.primaryPosition,
          secondaryPosition: p.secondaryPosition,
        }))}
      />
    </div>
  )
}
