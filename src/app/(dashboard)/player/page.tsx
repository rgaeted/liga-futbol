import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PlayerDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    include: {
      team: true,
      callUps: {
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
    return <p className="text-white">Perfil de jugador no encontrado.</p>
  }

  const upcoming = player.callUps.filter(
    (c) => c.match.status === 'SCHEDULED' || c.match.status === 'LIVE'
  )
  const played = player.callUps.filter((c) => c.match.status === 'FINISHED')

  return (
    <div className="space-y-6 text-white">
      <header>
        <h1 className="text-2xl font-bold">{session.user.name}</h1>
        <p className="text-slate-400">
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
        <MatchList items={played.slice(0, 5)} emptyText="Aún no jugaste partidos." />
      </section>

      <Link href="/player/matches" className="text-emerald-400 hover:underline">
        Ver todos mis partidos →
      </Link>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
      <p className="text-2xl font-bold text-emerald-400">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
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
      homeTeam: { name: string }
      awayTeam: { name: string }
      homeScore: number
      awayScore: number
      status: string
    }
  }>
  emptyText: string
}) {
  if (items.length === 0) return <p className="text-slate-500">{emptyText}</p>
  return (
    <ul className="space-y-2">
      {items.map(({ match }) => (
        <li key={match.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="flex justify-between">
            <span>
              {match.homeTeam.name} vs {match.awayTeam.name}
            </span>
            <span className="font-mono">
              {match.status === 'FINISHED'
                ? `${match.homeScore} - ${match.awayScore}`
                : new Date(match.scheduledAt).toLocaleDateString('es-AR')}
            </span>
          </div>
          {match.status === 'LIVE' && (
            <Link href={`/live/${match.id}`} className="text-xs text-red-400">
              EN VIVO →
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}
