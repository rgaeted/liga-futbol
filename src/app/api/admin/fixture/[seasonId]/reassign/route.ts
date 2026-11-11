import { z } from 'zod'
import { FixtureError, forceReassignDefinitions } from '@/lib/kelme-fixture/service'
import { readJson, runFixtureRoute } from '@/lib/kelme-fixture/route'

const bodySchema = z.object({ reason: z.string().min(3).max(300) })

/** Corrección explícita y auditada del cuadro de definiciones tras un conflicto. */
export async function POST(req: Request, { params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params
  return runFixtureRoute(seasonId, async (ctx) => {
    const parsed = bodySchema.safeParse(await readJson(req))
    if (!parsed.success) throw new FixtureError('Indica el motivo de la corrección.', 400)
    return forceReassignDefinitions({ ...ctx, reason: parsed.data.reason })
  })
}
