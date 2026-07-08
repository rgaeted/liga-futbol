import { z } from 'zod'

export const createSeasonSchema = z.object({
  name: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export const updateSeasonSchema = z.object({
  name: z.string().min(2).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>
export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>
