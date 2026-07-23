import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { matchDisplayName } from '@/lib/match-label'

export default async function PlayerMatchesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!player) redirect('/player')

  const callUps = await db.callUp.findMany({
    where: { playerId: player.id, match: { matchType: 'LEAGUE' } },
    include: {
      match: {
        include: { homeTeam: true, awayTeam: true },
      },
    },
    orderBy: { match: { scheduledAt: 'desc' } },
  })

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Mis Partidos</h1>
      {callUps.length === 0 ? (
        <p className="text-kelme-gray-400">Aún no has sido citado a ningún partido.</p>
      ) : (
        callUps.map(({ match, isStarter }) => (
          <div key={match.id} className="rounded-xl border border-kelme-border bg-kelme-surface p-4">
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {matchDisplayName(match)}
                  {match.mvpPlayerId === player.id && (
                    <span className="ml-2 text-xs font-semibold text-amber-600">⭐ MVP</span>
                  )}
                </p>
                <p className="text-sm text-kelme-gray-400">
                  {new Date(match.scheduledAt).toLocaleString('es-CL')} · {isStarter ? 'Titular' : 'Suplente'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono">{match.homeScore} - {match.awayScore}</p>
                <p className="text-xs text-kelme-gray-400">{match.status}</p>
                {match.status === 'LIVE' && (
                  <Link href={`/live/${match.id}`} className="text-xs text-red-400">EN VIVO</Link>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
