import { z } from 'zod'

const staffRoles = ['ORG_ADMIN', 'COACH', 'REFEREE'] as const
export const accessRoles = ['ORG_ADMIN', 'COACH', 'REFEREE', 'FRIENDLY_COACH', 'PLAYER'] as const

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  role: z.enum(staffRoles),
})

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(accessRoles).optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
