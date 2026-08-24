import { z } from 'zod'

const id = z.string().min(1)

const slot = z.object({
  slotKey: z.string().min(1),
  playerId: id,
})

const slotLayoutEntry = z.object({
  topPct: z.number().min(5).max(95),
  leftPct: z.number().min(5).max(95),
})

export const upsertMatchFormationSchema = z
  .object({
    scheme: z.string().min(1),
    teamId: id.optional(),
    side: z.enum(['A', 'B']).optional(),
    slots: z.array(slot).default([]),
    benchPlayerIds: z.array(id).optional(),
    slotLayout: z.record(z.string(), slotLayoutEntry).optional(),
  })
  .superRefine((data, ctx) => {
    const hasTeam = Boolean(data.teamId)
    const hasSide = Boolean(data.side)
    if (hasTeam === hasSide) {
      ctx.addIssue({
        code: 'custom',
        message: 'Debes indicar teamId (liga) o side (amistoso), no ambos ni ninguno',
        path: hasTeam ? ['side'] : ['teamId'],
      })
    }
  })

export type UpsertMatchFormationInput = z.infer<typeof upsertMatchFormationSchema>
