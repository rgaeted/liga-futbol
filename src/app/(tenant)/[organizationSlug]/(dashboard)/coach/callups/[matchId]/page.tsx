import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { CallUpForm } from '@/components/coach/CallUpForm'
import { matchDisplayName } from '@/lib/match-label'
import { footballFormatLabel } from '@/lib/football-format'

function slotsFromCallUps(
  callUps: Array<{ playerId: string; slotKey: string | null }>
): Record<string, string> {
  const slots: Record<string, string> = {}
  for (const c of callUps) {
    if (c.slotKey) slots[c.slotKey] = c.playerId
  }
  return slots
}

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
  if (match.matchType === 'FRIENDLY') notFound()
  if (match.homeTeamId !== team.id && match.awayTeamId !== team.id) {
    redirect('/coach')
  }

  const callUps = await db.callUp.findMany({
    where: { matchId, player: { teamId: team.id } },
  })
  const formation = await db.matchFormation.findFirst({
    where: { matchId, teamId: team.id },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Citación</h1>
      <p className="text-slate-400">
        {matchDisplayName(match)} · {footballFormatLabel(match.footballFormat)} ·{' '}
        {match.scheduledAt.toLocaleString('es-CL')}
      </p>
      <CallUpForm
        matchId={matchId}
        teamId={team.id}
        footballFormat={match.footballFormat}
        players={team.players}
        initialSelected={callUps.map((c) => c.playerId)}
        initialScheme={formation?.scheme ?? '4-3-3'}
        initialSlots={slotsFromCallUps(callUps)}
      />
    </div>
  )
}
