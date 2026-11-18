import { z } from 'zod'

export const setMatchJerseySchema = z.object({
  playerId: z.string().min(1),
  number: z.number().int().min(0).max(99).nullable(),
})
