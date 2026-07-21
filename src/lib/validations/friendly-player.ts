import { z } from 'zod'
import {
  DOMINANT_FOOT_VALUES,
  FRIENDLY_PLAYER_POSITIONS,
} from '@/lib/friendly-player-options'

const id = z.string().min(1)

function emptyToUndefined(value: unknown) {
  if (typeof value === 'string' && value.trim() === '') return undefined
  return value
}

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().email({ message: 'Email inválido' }).optional()
)

const optionalPassword = z.preprocess(
  emptyToUndefined,
  z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }).optional()
)

const profileFields = {
  dominantFoot: z.preprocess(
    emptyToUndefined,
    z.enum(DOMINANT_FOOT_VALUES).optional()
  ),
  primaryPosition: z.preprocess(
    emptyToUndefined,
    z.enum(FRIENDLY_PLAYER_POSITIONS).optional()
  ),
  secondaryPosition: z.preprocess(
    emptyToUndefined,
    z.enum(FRIENDLY_PLAYER_POSITIONS).optional()
  ),
}

export const createFriendlyPlayerSchema = z
  .object({
    firstName: z.string().trim().min(1, { message: 'Ingresa el nombre' }),
    lastName: z.string().trim().min(1, { message: 'Ingresa el apellido' }),
    friendlyCategoryId: id,
    email: optionalEmail,
    password: optionalPassword,
    ...profileFields,
  })
  .superRefine((data, ctx) => {
    const hasEmail = Boolean(data.email)
    const hasPassword = Boolean(data.password)
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
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
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
