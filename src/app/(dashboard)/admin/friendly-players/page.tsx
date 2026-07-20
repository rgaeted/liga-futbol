import { db } from '@/lib/db'
import { FriendlyPlayerForm } from '@/components/admin/FriendlyPlayerForm'
import { FriendlyPlayersTable } from '@/components/admin/FriendlyPlayersTable'

export default async function AdminFriendlyPlayersPage() {
  const players = await db.friendlyPlayer.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dominantFoot: true,
      primaryPosition: true,
      secondaryPosition: true,
      photoMimeType: true,
      user: { select: { email: true } },
    },
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
          hasPhoto: Boolean(p.photoMimeType),
          dominantFoot: p.dominantFoot,
          primaryPosition: p.primaryPosition,
          secondaryPosition: p.secondaryPosition,
        }))}
      />
    </div>
  )
}
