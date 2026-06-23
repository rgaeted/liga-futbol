import { z } from 'zod'

export const createPlayerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  teamId: z.string().cuid().optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  position: z.string().optional(),
})

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
