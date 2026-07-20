import { z } from 'zod'

const id = z.string().min(1)

export const createFriendlyPlayerSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
  })
  .superRefine((data, ctx) => {
    const hasEmail = data.email !== undefined
    const hasPassword = data.password !== undefined
    if (hasEmail !== hasPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Email y contraseña deben ir juntos',
        path: hasEmail ? ['password'] : ['email'],
      })
    }
  })

export const updateFriendlyPlayerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
})

export const claimFriendlyPlayerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  friendlyPlayerId: id,
})

export type CreateFriendlyPlayerInput = z.infer<typeof createFriendlyPlayerSchema>
export type UpdateFriendlyPlayerInput = z.infer<typeof updateFriendlyPlayerSchema>
export type ClaimFriendlyPlayerInput = z.infer<typeof claimFriendlyPlayerSchema>