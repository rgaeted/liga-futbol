import { db } from '@/lib/db'
import { FriendlyMatchCreateWizard } from '@/components/admin/match-create/FriendlyMatchCreateWizard'
import { Role } from '@prisma/client'

export default async function NewFriendlyMatchPage() {
  const [referees, friendlyCategories, friendlyPlayers] = await Promise.all([
    db.user.findMany({
      where: { role: Role.REFEREE },
      select: { id: true, name: true },
    }),
    db.friendlyCategory.findMany({ orderBy: { name: 'asc' } }),
    db.friendlyPlayer.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryPosition: true,
        photoMimeType: true,
        categories: { select: { friendlyCategoryId: true } },
      },
    }),
  ])

  const rosterPlayers = friendlyPlayers.map((player) => ({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    categoryIds: player.categories.map((category) => category.friendlyCategoryId),
    primaryPosition: player.primaryPosition,
    hasPhoto: Boolean(player.photoMimeType),
  }))

  return (
    <FriendlyMatchCreateWizard
      referees={referees}
      categories={friendlyCategories.map((category) => ({
        id: category.id,
        name: category.name,
        isActive: category.isActive,
      }))}
      friendlyPlayers={rosterPlayers}
    />
  )
}
