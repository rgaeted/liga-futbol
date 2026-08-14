import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { EvaluationForm } from '@/components/coach/EvaluationForm'
import { PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

export default async function CoachEvaluationsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const team = await db.team.findUnique({
    where: { coachId: session.user.id },
    include: {
      players: { include: PLAYER_PERSON_NAME_INCLUDE },
    },
  })

  if (!team) return <p>No tienes un equipo asignado.</p>

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Evaluaciones</h1>
      <EvaluationForm players={team.players} />
    </div>
  )
}
