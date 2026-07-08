import { z } from 'zod'

const id = z.string().min(1)

export const createMatchSchema = z.object({
  seasonId: id,
  homeTeamId: id,
  awayTeamId: id,
  refereeId: id.optional(),
  scheduledAt: z.string().datetime(),
  venue: z.string().optional(),
})

export const updateMatchSchema = z.object({
  refereeId: id.nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  venue: z.string().nullable().optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'CANCELLED']).optional(),
})

export type CreateMatchInput = z.infer<typeof createMatchSchema>
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>
