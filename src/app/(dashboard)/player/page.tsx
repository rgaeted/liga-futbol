import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { matchDisplayName } from '@/lib/match-label'

export default async function PlayerDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    include: {
      team: true,
      callUps: {
        where: { match: { matchType: 'LEAGUE' } },
        include: {
          match: {
            include: { homeTeam: true, awayTeam: true },
          },
        },
        orderBy: { match: { scheduledAt: 'desc' } },
      },
    },
  })

  if (!player) {
    return <p className="text-kelme-gray-900">Perfil de jugador no encontrado.</p>
  }

  const upcoming = player.callUps.filter(
    (c) => c.match.status === 'SCHEDULED' || c.match.status === 'LIVE'
  )
  const played = player.callUps.filter((c) => c.match.status === 'FINISHED')

  return (
    <div className="space-y-6 text-kelme-gray-900">
      <header>
        <h1 className="font-display text-2xl font-bold">{session.user.name}</h1>
        <p className="text-kelme-gray-400">
          {player.team?.name ?? 'Sin equipo'} · #{player.jerseyNumber ?? '—'} · {player.position ?? '—'}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Goles" value={player.goals} />
        <StatCard label="Asistencias" value={player.assists} />
        <StatCard label="Amarillas" value={player.yellowCards} />
        <StatCard label="Rojas" value={player.redCards} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Próximos partidos</h2>
        <MatchList items={upcoming} emptyText="No hay partidos programados." />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Partidos jugados</h2>
        <MatchList items={played.slice(0, 5)} emptyText="Aún no has jugado partidos." />
      </section>

      <Link href="/player/matches" className="text-kelme-red hover:underline">
        Ver todos mis partidos →
      </Link>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-kelme-border bg-kelme-surface p-4 text-center">
      <p className="font-display text-2xl font-bold text-kelme-red">{value}</p>
      <p className="text-sm text-kelme-gray-400">{label}</p>
    </div>
  )
}

function MatchList({
  items,
  emptyText,
}: {
  items: Array<{
    match: {
      id: string
      scheduledAt: Date
      homeTeam: { name: string } | null
      awayTeam: { name: string } | null
      matchType: 'LEAGUE' | 'FRIENDLY'
      sideAName: string | null
      sideBName: string | null
      homeScore: number
      awayScore: number
      status: string
    }
  }>
  emptyText: string
}) {
  if (items.length === 0) return <p className="text-kelme-gray-400">{emptyText}</p>
  return (
    <ul className="space-y-2">
      {items.map(({ match }) => (
        <li key={match.id} className="rounded-lg border border-kelme-border bg-kelme-surface p-3">
          <div className="flex justify-between">
            <span>
              {matchDisplayName(match)}
            </span>
            <span className="font-mono">
              {match.status === 'FINISHED'
                ? `${match.homeScore} - ${match.awayScore}`
                : new Date(match.scheduledAt).toLocaleDateString('es-CL')}
            </span>
          </div>
          {match.status === 'LIVE' && (
            <Link href={`/live/${match.id}`} className="font-ui text-xs text-kelme-red">
              EN VIVO →
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}
