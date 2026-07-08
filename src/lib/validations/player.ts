import { z } from 'zod'

const id = z.string().min(1)

export const createPlayerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  teamId: id.optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  position: z.string().optional(),
})

export const updatePlayerSchema = z.object({
  teamId: id.nullable().optional(),
  jerseyNumber: z.number().int().min(1).max(99).nullable().optional(),
  position: z.string().nullable().optional(),
})

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>
