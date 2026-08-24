import { z } from 'zod'

export const assignableRoles = ['ORG_ADMIN', 'COACH', 'REFEREE', 'PLAYER'] as const

const rolesSchema = z
  .array(z.enum(assignableRoles))
  .min(1, 'Debes elegir al menos un rol')
  .refine((roles) => new Set(roles).size === roles.length, 'Roles duplicados')

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  roles: rolesSchema,
})

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  roles: rolesSchema.optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
