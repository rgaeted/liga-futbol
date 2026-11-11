import { z } from 'zod'
import { FixtureError, renameFixtureTeam } from '@/lib/kelme-fixture/service'
import { readJson, runFixtureRoute } from '@/lib/kelme-fixture/route'

const bodySchema = z.object({ name: z.string().min(2).max(60) })

/** Renombra un equipo (por ejemplo, los provisionales «Equipo nuevo A/B»). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ seasonId: string; teamId: string }> },
) {
  const { seasonId, teamId } = await params
  return runFixtureRoute(seasonId, async (ctx) => {
    const parsed = bodySchema.safeParse(await readJson(req))
    if (!parsed.success) throw new FixtureError('El nombre debe tener entre 2 y 60 caracteres.', 400)
    return renameFixtureTeam({ ...ctx, teamId, name: parsed.data.name })
  })
}
