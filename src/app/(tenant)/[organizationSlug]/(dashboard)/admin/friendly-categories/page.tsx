import { db } from '@/lib/db'
import { FriendlyCategoryForm } from '@/components/admin/FriendlyCategoryForm'
import { FriendlyCategoriesTable } from '@/components/admin/FriendlyCategoriesTable'

export default async function AdminFriendlyCategoriesPage() {
  const categories = await db.friendlyCategory.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { playerMemberships: true, matches: true } } },
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Categorías amistosas</h1>
      <p className="text-sm text-kelme-gray-400">
        Cada categoría agrupa jugadores y partidos amistosos. Un jugador puede pertenecer a
        varias categorías.
      </p>
      <FriendlyCategoryForm />
      <FriendlyCategoriesTable
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          isActive: c.isActive,
          playerCount: c._count.playerMemberships,
          matchCount: c._count.matches,
        }))}
      />
    </div>
  )
}
