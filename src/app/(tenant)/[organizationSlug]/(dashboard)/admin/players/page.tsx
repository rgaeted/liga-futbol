import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireOrganizationId } from '@/lib/tenant-access'
import { OrgPlayerForm } from '@/components/admin/OrgPlayerForm'
import { PlayersTable } from '@/components/admin/PlayersTable'
import { playerDisplayName } from '@/lib/person-name'

export default async function AdminPlayersPage({
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

  const [players, teams] = await Promise.all([
    db.player.findMany({
      where: { organizationId },
      include: {
        person: { include: { user: { select: { name: true, email: true } } } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { person: { firstName: 'asc' } },
    }),
    db.team.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    }),
  ])

  const teamOptions = teams.map((t) => ({ id: t.id, name: t.name }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Jugadores</h1>
        <p className="mt-1 text-sm text-kelme-gray-500">
          Plantel de tu liga: jugadores y equipos de esta organización. Las categorías amistosas se
          gestionan aparte, al crear o editar partidos amistosos.
        </p>
      </div>
      <OrgPlayerForm teams={teamOptions} />
      <PlayersTable
        players={players.map((p) => ({
          id: p.id,
          name: playerDisplayName(p),
          email: p.person.user?.email ?? '',
          teamId: p.team?.id ?? null,
          teamName: p.team?.name ?? null,
          jerseyNumber: p.jerseyNumber,
          position: p.position ?? p.primaryPosition,
        }))}
        teams={teamOptions}
      />
    </div>
  )
}
