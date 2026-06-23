import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function RefereeDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const matches = await db.match.findMany({
    where: { refereeId: session.user.id },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { scheduledAt: 'asc' },
  })

  return (
    <div className="space-y-4 text-white">
      <h1 className="text-2xl font-bold">Mis partidos</h1>
      {matches.map((match) => (
        <Link
          key={match.id}
          href={`/referee/match/${match.id}`}
          className="block rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-emerald-600"
        >
          <p className="font-semibold">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </p>
          <p className="text-sm text-slate-400">
            {match.scheduledAt.toLocaleString('es-AR')} · {match.status}
          </p>
        </Link>
      ))}
      {matches.length === 0 && (
        <p className="text-slate-500">No tenés partidos asignados.</p>
      )}
    </div>
  )
}
