import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { EvaluationForm } from '@/components/coach/EvaluationForm'

export default async function CoachEvaluationsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const team = await db.team.findUnique({
    where: { coachId: session.user.id },
    include: {
      players: { include: { user: { select: { name: true } } } },
    },
  })

  if (!team) return <p>No tenés un equipo asignado.</p>

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Evaluaciones</h1>
      <EvaluationForm players={team.players} />
    </div>
  )
}
