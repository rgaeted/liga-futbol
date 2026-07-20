import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { matchDisplayName } from '@/lib/match-label'

export default async function RefereeDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const matches = await db.match.findMany({
    where: { refereeId: session.user.id },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { scheduledAt: 'asc' },
  })

  return (
    <div className="space-y-4 text-kelme-gray-900">
      <h1 className="font-display text-2xl font-bold">Mis partidos</h1>
      {matches.map((match) => (
        <Link
          key={match.id}
          href={`/referee/match/${match.id}`}
          className="block rounded-xl border border-kelme-border bg-kelme-surface p-4 hover:border-kelme-red"
        >
          <p className="font-semibold">{matchDisplayName(match)}</p>
          <p className="text-sm text-kelme-gray-400">
            {match.scheduledAt.toLocaleString('es-CL')} · {match.status}
          </p>
        </Link>
      ))}
      {matches.length === 0 && (
        <p className="text-kelme-gray-400">No tienes partidos asignados.</p>
      )}
    </div>
  )
}
