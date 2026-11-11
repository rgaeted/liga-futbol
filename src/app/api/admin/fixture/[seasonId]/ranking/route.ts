import { z } from 'zod'
import {
  clearManualRanking,
  FixtureError,
  isTableKey,
  saveManualRanking,
} from '@/lib/kelme-fixture/service'
import { readJson, runFixtureRoute } from '@/lib/kelme-fixture/route'

const setSchema = z.object({
  table: z.string().refine(isTableKey),
  teamIds: z.array(z.string().min(1)).min(2).max(6),
  reason: z.string().min(3).max(300),
})

const clearSchema = z.object({
  table: z.string().refine(isTableKey),
  reason: z.string().min(3).max(300),
})

/** Registra el orden manual aprobado para un empate irresoluble. */
export async function PUT(req: Request, { params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params
  return runFixtureRoute(seasonId, async (ctx) => {
    const parsed = setSchema.safeParse(await readJson(req))
    if (!parsed.success) throw new FixtureError('Indica el orden de los equipos y el motivo.', 400)
    return saveManualRanking({
      ...ctx,
      table: parsed.data.table as 'A' | 'B' | 'LEAGUE',
      teamIds: parsed.data.teamIds,
      reason: parsed.data.reason,
    })
  })
}

/** Quita el orden manual y vuelve al cálculo automático. */
export async function DELETE(req: Request, { params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params
  return runFixtureRoute(seasonId, async (ctx) => {
    const parsed = clearSchema.safeParse(await readJson(req))
    if (!parsed.success) throw new FixtureError('Indica la tabla y el motivo.', 400)
    return clearManualRanking({
      ...ctx,
      table: parsed.data.table as 'A' | 'B' | 'LEAGUE',
      reason: parsed.data.reason,
    })
  })
}
