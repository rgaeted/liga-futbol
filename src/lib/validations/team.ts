import { z } from 'zod'
import { teamColorSchema } from '@/lib/team-color'

const id = z.string().min(1)

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  logoUrl: z.string().url().optional().or(z.literal('')),
  color: teamColorSchema.optional(),
  coachId: id.optional(),
})

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().nullable().optional().or(z.literal('')),
  color: teamColorSchema.nullable().optional(),
  coachId: id.nullable().optional(),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
