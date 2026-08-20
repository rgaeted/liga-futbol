import { z } from 'zod'

const id = z.string().min(1)

export const createPlayerSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().min(2).optional(),
    password: z.string().min(6).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().optional(),
    teamId: id.optional(),
    jerseyNumber: z.number().int().min(1).max(99).optional(),
    position: z.string().optional(),
    dominantFoot: z.enum(['LEFT', 'RIGHT', 'BOTH']).nullable().optional(),
    primaryPosition: z.string().nullable().optional(),
    secondaryPosition: z.string().nullable().optional(),
    categoryIds: z.array(id).optional(),
  })
  .superRefine((val, ctx) => {
    const hasAccount = Boolean(val.email && val.password && val.name)
    const hasNames = Boolean(val.firstName)
    if (!hasAccount && !hasNames) {
      ctx.addIssue({ code: 'custom', message: 'Indica nombre o cuenta de acceso' })
    }
  })

export const updatePlayerSchema = z.object({
  teamId: id.nullable().optional(),
  jerseyNumber: z.number().int().min(1).max(99).nullable().optional(),
  position: z.string().nullable().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  dominantFoot: z.enum(['LEFT', 'RIGHT', 'BOTH']).nullable().optional(),
  primaryPosition: z.string().nullable().optional(),
  secondaryPosition: z.string().nullable().optional(),
  categoryIds: z.array(id).optional(),
})

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>

export const claimPlayerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  playerId: id,
})
