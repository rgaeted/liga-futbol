import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'
import { FriendlyPlayerForm } from '@/components/admin/FriendlyPlayerForm'
import { FriendlyPlayersTable } from '@/components/admin/FriendlyPlayersTable'
import { playerDisplayName } from '@/lib/person-name'

export const dynamic = 'force-dynamic'

export default async function AdminPlayersPage({
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

  const [players, categories, teams] = await Promise.all([
    db.player.findMany({
      where: { organizationId },
      include: {
        person: {
          include: { user: { select: { name: true, email: true } } },
        },
        categories: { select: { friendlyCategoryId: true } },
      },
      orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }],
    }),
    db.friendlyCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    }),
    db.team.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    }),
  ])

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }))
  const teamOptions = teams.map((team) => ({ id: team.id, name: team.name }))
  const defaultCategoryIds =
    categoryId && categories.some((category) => category.id === categoryId)
      ? [categoryId]
      : []

  const mergeOptions = players.map((player) => ({
    personId: player.personId,
    label: playerDisplayName(player),
  }))

  const rows = players.map((player) => ({
    id: player.id,
    personId: player.personId,
    firstName: player.person.firstName,
    lastName: player.person.lastName,
    email: player.person.user?.email ?? null,
    hasPhoto: Boolean(player.person.photoMimeType),
    dominantFoot: player.dominantFoot,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    categoryIds: player.categories.map((link) => link.friendlyCategoryId),
  }))

  const filteredRows = categoryId
    ? rows.filter((row) => row.categoryIds.includes(categoryId))
    : rows

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Jugadores</h1>
        <p className="mt-1 text-sm text-kelme-gray-500">
          Fichas de jugadores de tu organización: categorías, equipo, foto de perfil y cuenta de
          acceso opcional.
        </p>
        {categoryOptions.length > 0 && (
          <p className="mt-2 text-sm">
            <Link
              href={orgPath(organizationSlug, '/admin/friendly-categories')}
              className="font-semibold text-kelme-red hover:underline"
            >
              Gestionar categorías amistosas
            </Link>
          </p>
        )}
      </div>
      <FriendlyPlayerForm
        categories={categoryOptions}
        teams={teamOptions}
        defaultCategoryIds={defaultCategoryIds}
      />
      {categoryId && (
        <p className="text-sm text-kelme-gray-500">
          Filtrando por categoría.{' '}
          <Link
            href={orgPath(organizationSlug, '/admin/players')}
            className="font-semibold text-kelme-red hover:underline"
          >
            Ver todos
          </Link>
        </p>
      )}
      <FriendlyPlayersTable
        players={filteredRows}
        categories={categoryOptions}
        mergeOptions={mergeOptions}
      />
    </div>
  )
}
