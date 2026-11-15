import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { EvaluationForm } from '@/components/coach/EvaluationForm'
import { PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

export default async function CoachEvaluationsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Un DT puede dirigir varios equipos: se evalúa a los jugadores de todos ellos.
  const players = await db.player.findMany({
    where: { team: { coachId: session.user.id } },
    include: PLAYER_PERSON_NAME_INCLUDE,
    orderBy: [{ teamId: 'asc' }, { jerseyNumber: 'asc' }],
  })

  if (players.length === 0) return <p>No tienes un equipo asignado.</p>

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Evaluaciones</h1>
      <EvaluationForm players={players} />
    </div>
  )
}
