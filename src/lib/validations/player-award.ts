import { z } from 'zod'

export const grantPlayerAwardSchema = z.object({
  orgAwardId: z.string().min(1),
  seasonId: z.string().min(1).optional().nullable(),
  note: z.string().trim().max(200).optional().nullable(),
})

export type GrantPlayerAwardInput = z.infer<typeof grantPlayerAwardSchema>
