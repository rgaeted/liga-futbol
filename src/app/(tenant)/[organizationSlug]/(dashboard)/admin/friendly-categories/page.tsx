import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireOrganizationId } from '@/lib/tenant-access'
import { FriendlyCategoryForm } from '@/components/admin/FriendlyCategoryForm'
import { FriendlyCategoriesTable } from '@/components/admin/FriendlyCategoriesTable'

export default async function AdminFriendlyCategoriesPage({
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

  const categories = await db.friendlyCategory.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { playerLinks: true, matches: true } } },
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
          playerCount: c._count.playerLinks,
          matchCount: c._count.matches,
        }))}
      />
    </div>
  )
}
