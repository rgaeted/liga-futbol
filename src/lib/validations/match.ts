import { z } from 'zod'

export const createMatchSchema = z.object({
  seasonId: z.string().cuid(),
  homeTeamId: z.string().cuid(),
  awayTeamId: z.string().cuid(),
  refereeId: z.string().cuid().optional(),
  scheduledAt: z.string().datetime(),
  venue: z.string().optional(),
})

export type CreateMatchInput = z.infer<typeof createMatchSchema>
