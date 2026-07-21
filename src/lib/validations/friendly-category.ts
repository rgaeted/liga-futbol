import { z } from 'zod'

export const createFriendlyCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const updateFriendlyCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export type CreateFriendlyCategoryInput = z.infer<typeof createFriendlyCategorySchema>
export type UpdateFriendlyCategoryInput = z.infer<typeof updateFriendlyCategorySchema>
