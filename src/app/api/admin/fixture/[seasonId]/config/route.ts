import { z } from 'zod'
import { FixtureError, saveDrawPolicy } from '@/lib/kelme-fixture/service'
import { readJson, runFixtureRoute } from '@/lib/kelme-fixture/route'

const bodySchema = z.object({
  definitionDrawPolicy: z.enum(['PENALTIES_REQUIRED', 'DRAW_ALLOWED']),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params
  return runFixtureRoute(seasonId, async (ctx) => {
    const parsed = bodySchema.safeParse(await readJson(req))
    if (!parsed.success) throw new FixtureError('Política de empate inválida.', 400)
    return saveDrawPolicy({ ...ctx, policy: parsed.data.definitionDrawPolicy })
  })
}
