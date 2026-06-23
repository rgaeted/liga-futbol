import { z } from 'zod'

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  logoUrl: z.string().url().optional().or(z.literal('')),
  coachId: z.string().cuid().optional(),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
