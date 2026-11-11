import { z } from 'zod'
import { FixtureError, saveMatchResult } from '@/lib/kelme-fixture/service'
import { readJson, runFixtureRoute } from '@/lib/kelme-fixture/route'

const score = z.number().int().min(0).max(99).nullable().optional()

const bodySchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINAL', 'CANCELLED']),
  homeGoals: score,
  awayGoals: score,
  penaltyHome: score,
  penaltyAway: score,
  confirmFinal: z.boolean().optional(),
  reason: z.string().max(300).optional(),
  expectedUpdatedAt: z.string().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ seasonId: string; matchId: string }> },
) {
  const { seasonId, matchId } = await params
  return runFixtureRoute(seasonId, async (ctx) => {
    const parsed = bodySchema.safeParse(await readJson(req))
    if (!parsed.success) throw new FixtureError('Datos del resultado inválidos.', 400)
    return saveMatchResult({
      ...ctx,
      matchId,
      status: parsed.data.status,
      homeGoals: parsed.data.homeGoals ?? null,
      awayGoals: parsed.data.awayGoals ?? null,
      penaltyHome: parsed.data.penaltyHome ?? null,
      penaltyAway: parsed.data.penaltyAway ?? null,
      confirmFinal: parsed.data.confirmFinal,
      reason: parsed.data.reason,
      expectedUpdatedAt: parsed.data.expectedUpdatedAt,
    })
  })
}
