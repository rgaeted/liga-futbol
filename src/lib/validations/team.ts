import { z } from 'zod'

const id = z.string().min(1)

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  logoUrl: z.string().url().optional().or(z.literal('')),
  coachId: id.optional(),
})

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().nullable().optional().or(z.literal('')),
  coachId: id.nullable().optional(),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
