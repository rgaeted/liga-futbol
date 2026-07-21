import { z } from 'zod'

const id = z.string().min(1)

const leagueSlot = z.object({
  slotKey: z.string().min(1),
  playerId: id,
})

const friendlySlot = z.object({
  slotKey: z.string().min(1),
  friendlyPlayerId: id,
})

export const upsertMatchFormationSchema = z
  .object({
    scheme: z.string().min(1),
    teamId: id.optional(),
    side: z.enum(['A', 'B']).optional(),
    slots: z.array(z.union([leagueSlot, friendlySlot])).default([]),
    benchPlayerIds: z.array(id).optional(),
    benchFriendlyPlayerIds: z.array(id).optional(),
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
