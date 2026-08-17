import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireOrganizationId } from '@/lib/tenant-access'
import { FriendlyPlayerForm } from '@/components/admin/FriendlyPlayerForm'
import { FriendlyPlayersTable } from '@/components/admin/FriendlyPlayersTable'
import { mapFriendlyPlayerCategoryIds } from '@/lib/friendly-player-categories'
import { orgPath } from '@/lib/tenant-paths'
import Link from 'next/link'

export default async function AdminFriendlyPlayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string }>
  searchParams: Promise<{ categoryId?: string }>
}) {
  const { organizationSlug } = await params
  const { categoryId } = await searchParams

  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const categories = await db.friendlyCategory.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  })

  const selectedCategoryId = categoryId ?? categories[0]?.id ?? null

  const players = selectedCategoryId
    ? await db.friendlyPlayer.findMany({
        where: { categories: { some: { friendlyCategoryId: selectedCategoryId } } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
          id: true,
          personId: true,
          firstName: true,
          lastName: true,
          dominantFoot: true,
          primaryPosition: true,
          secondaryPosition: true,
          photoMimeType: true,
          categories: { select: { friendlyCategoryId: true } },
          person: { select: { user: { select: { email: true } } } },
        },
      })
    : []

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  const allOrgPlayers = await db.friendlyPlayer.findMany({
    where: { organizationId },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: { personId: true, firstName: true, lastName: true },
  })
  const mergeOptions = allOrgPlayers.map((p) => ({
    personId: p.personId,
    label: `${p.firstName} ${p.lastName}`.trim(),
  }))

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Jugadores amistosos</h1>

      {categories.length === 0 ? (
        <p className="text-kelme-gray-400">
          Primero crea una{' '}
          <Link href={orgPath(organizationSlug, '/admin/friendly-categories')} className="text-kelme-red hover:underline">
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
                href={orgPath(organizationSlug, `/admin/friendly-players?categoryId=${category.id}`)}
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
            mergeOptions={mergeOptions}
            players={players.map((p) => ({
              id: p.id,
              personId: p.personId,
              firstName: p.firstName,
              lastName: p.lastName,
              email: p.person.user?.email ?? null,
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
