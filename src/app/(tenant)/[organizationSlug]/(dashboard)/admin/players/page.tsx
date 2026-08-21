import Link from 'next/link'
import { db } from '@/lib/db'
import { orgPath } from '@/lib/tenant-paths'
import { FriendlyPlayerForm } from '@/components/admin/FriendlyPlayerForm'
import { PlayersTable } from '@/components/admin/PlayersTable'
import { playerDisplayName } from '@/lib/person-name'

export default async function AdminPlayersPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params

  const [players, teams, categories] = await Promise.all([
    db.player.findMany({
      include: {
        person: { include: { user: { select: { name: true, email: true } } } },
        team: { select: { id: true, name: true } },
        categories: { include: { friendlyCategory: { select: { id: true, name: true } } } },
      },
      orderBy: { person: { firstName: 'asc' } },
    }),
    db.team.findMany({ orderBy: { name: 'asc' } }),
    db.friendlyCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ])

  const defaultCategoryIds = categories.length > 0 ? [categories[0].id] : []
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }))
  const teamOptions = teams.map((t) => ({ id: t.id, name: t.name }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Jugadores</h1>
        <Link
          href={orgPath(organizationSlug, '/admin/friendly-categories')}
          className="text-sm font-semibold text-kelme-red hover:underline"
        >
          Gestionar categorías amistosas
        </Link>
      </div>
      <FriendlyPlayerForm
        categories={categoryOptions}
        teams={teamOptions}
        defaultCategoryIds={defaultCategoryIds}
      />
      <PlayersTable
        players={players.map((p) => ({
          id: p.id,
          name: playerDisplayName(p),
          email: p.person.user?.email ?? '',
          teamId: p.team?.id ?? null,
          teamName: p.team?.name ?? null,
          jerseyNumber: p.jerseyNumber,
          position: p.position ?? p.primaryPosition,
          categoryNames: p.categories.map((c) => c.friendlyCategory.name),
        }))}
        teams={teamOptions}
        categories={categoryOptions}
      />
    </div>
  )
}
