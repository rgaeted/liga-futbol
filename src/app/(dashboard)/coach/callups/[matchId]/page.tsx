import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { CallUpForm } from '@/components/coach/CallUpForm'

export default async function CoachCallUpPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { matchId } = await params
  const team = await db.team.findUnique({
    where: { coachId: session.user.id },
    include: {
      players: {
        include: { user: { select: { name: true } } },
        orderBy: { jerseyNumber: 'asc' },
      },
    },
  })

  if (!team) redirect('/coach')

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  })

  if (!match) notFound()
  if (match.homeTeamId !== team.id && match.awayTeamId !== team.id) {
    redirect('/coach')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Citación</h1>
      <p className="text-slate-400">
        {match.homeTeam.name} vs {match.awayTeam.name} · {match.scheduledAt.toLocaleString('es-CL')}
      </p>
      <CallUpForm matchId={matchId} players={team.players} />
    </div>
  )
}
