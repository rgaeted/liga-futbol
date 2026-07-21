import { db } from '@/lib/db'
import { FriendlyPlayerForm } from '@/components/admin/FriendlyPlayerForm'
import { FriendlyPlayersTable } from '@/components/admin/FriendlyPlayersTable'
import { mapFriendlyPlayerCategoryIds } from '@/lib/friendly-player-categories'
import Link from 'next/link'

export default async function AdminFriendlyPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>
}) {
  const { categoryId } = await searchParams

  const categories = await db.friendlyCategory.findMany({
    orderBy: { name: 'asc' },
  })

  const selectedCategoryId = categoryId ?? categories[0]?.id ?? null

  const players = selectedCategoryId
    ? await db.friendlyPlayer.findMany({
        where: { categories: { some: { friendlyCategoryId: selectedCategoryId } } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dominantFoot: true,
          primaryPosition: true,
          secondaryPosition: true,
          photoMimeType: true,
          categories: { select: { friendlyCategoryId: true } },
          user: { select: { email: true } },
        },
      })
    : []

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Jugadores amistosos</h1>

      {categories.length === 0 ? (
        <p className="text-kelme-gray-400">
          Primero crea una{' '}
          <Link href="/admin/friendly-categories" className="text-kelme-red hover:underline">
            categoría amistosa
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/admin/friendly-players?categoryId=${category.id}`}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  category.id === selectedCategoryId
                    ? 'bg-kelme-red text-white'
                    : 'border border-kelme-border bg-kelme-surface hover:border-kelme-red'
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>

          {selectedCategory && (
            <p className="text-sm text-kelme-gray-400">
              Jugadores de <strong>{selectedCategory.name}</strong> (pueden pertenecer a varias
              categorías)
            </p>
          )}

          <FriendlyPlayerForm
            categories={categories.filter((c) => c.isActive)}
            defaultCategoryIds={selectedCategoryId ? [selectedCategoryId] : []}
          />
          <FriendlyPlayersTable
            categories={categories}
            players={players.map((p) => ({
              id: p.id,
              firstName: p.firstName,
              lastName: p.lastName,
              email: p.user?.email ?? null,
              hasPhoto: Boolean(p.photoMimeType),
              dominantFoot: p.dominantFoot,
              primaryPosition: p.primaryPosition,
              secondaryPosition: p.secondaryPosition,
              categoryIds: mapFriendlyPlayerCategoryIds(p.categories),
            }))}
          />
        </>
      )}
    </div>
  )
}
