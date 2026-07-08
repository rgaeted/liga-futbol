import { db } from '@/lib/db'
import { MatchForm } from '@/components/admin/MatchForm'
import { MatchActions } from '@/components/admin/MatchActions'
import Link from 'next/link'
import { Role } from '@prisma/client'

export default async function AdminMatchesPage() {
  const [matches, seasons, teams, referees] = await Promise.all([
    db.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: { select: { name: true } },
        season: true,
      },
      orderBy: { scheduledAt: 'desc' },
    }),
    db.season.findMany({ orderBy: { startDate: 'desc' } }),
    db.team.findMany({ orderBy: { name: 'asc' } }),
    db.user.findMany({
      where: { role: Role.REFEREE },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Partidos</h1>
      <MatchForm seasons={seasons} teams={teams} referees={referees} />
      <div className="space-y-3">
        {matches.map((match) => (
          <div key={match.id} className="rounded-xl border border-kelme-border bg-kelme-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </p>
                <p className="text-sm text-kelme-gray-400">
                  {match.season.name} · {match.scheduledAt.toLocaleString('es-AR')}
                  {match.referee ? ` · ${match.referee.name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg">
                  {match.homeScore} - {match.awayScore}
                </span>
                <span className="rounded-full bg-kelme-gray-100 px-3 py-1 text-xs">{match.status}</span>
                <Link href={`/live/${match.id}`} className="text-sm text-kelme-red hover:underline">
                  Ver en vivo
                </Link>
                <MatchActions
                  match={{
                    id: match.id,
                    label: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
                    refereeId: match.refereeId,
                    venue: match.venue,
                    status: match.status,
                    date: match.scheduledAt.toISOString().slice(0, 10),
                    time: match.scheduledAt.toISOString().slice(11, 16),
                  }}
                  referees={referees}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
