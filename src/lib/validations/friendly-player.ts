import { z } from 'zod'
import {
  DOMINANT_FOOT_VALUES,
  FRIENDLY_PLAYER_POSITIONS,
} from '@/lib/friendly-player-options'

const id = z.string().min(1)

const profileFields = {
  dominantFoot: z.enum(DOMINANT_FOOT_VALUES).optional(),
  primaryPosition: z.enum(FRIENDLY_PLAYER_POSITIONS).optional(),
  secondaryPosition: z.enum(FRIENDLY_PLAYER_POSITIONS).optional(),
}

export const createFriendlyPlayerSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    ...profileFields,
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
    if (
      data.primaryPosition &&
      data.secondaryPosition &&
      data.primaryPosition === data.secondaryPosition
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'La segunda posición debe ser distinta de la principal',
        path: ['secondaryPosition'],
      })
    }
  })

export const updateFriendlyPlayerSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    dominantFoot: z.enum(DOMINANT_FOOT_VALUES).nullable().optional(),
    primaryPosition: z.enum(FRIENDLY_PLAYER_POSITIONS).nullable().optional(),
    secondaryPosition: z.enum(FRIENDLY_PLAYER_POSITIONS).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.primaryPosition &&
      data.secondaryPosition &&
      data.primaryPosition === data.secondaryPosition
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'La segunda posición debe ser distinta de la principal',
        path: ['secondaryPosition'],
      })
    }
  })

export const claimFriendlyPlayerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  friendlyPlayerId: id,
})

export type CreateFriendlyPlayerInput = z.infer<typeof createFriendlyPlayerSchema>
export type UpdateFriendlyPlayerInput = z.infer<typeof updateFriendlyPlayerSchema>
export type ClaimFriendlyPlayerInput = z.infer<typeof claimFriendlyPlayerSchema>
