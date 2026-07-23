import { z } from 'zod'

const id = z.string().min(1)

export const matchMvpSideSchema = z.enum(['HOME', 'AWAY'])

export const setMatchMvpSchema = z
  .object({
    side: matchMvpSideSchema,
    playerId: id.nullable().optional(),
    friendlyPlayerId: id.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const hasPlayer = data.playerId != null && data.playerId !== ''
    const hasFriendly = data.friendlyPlayerId != null && data.friendlyPlayerId !== ''
    if (hasPlayer && hasFriendly) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indica solo un jugador MVP',
        path: ['playerId'],
      })
    }
  })

export type SetMatchMvpInput = z.infer<typeof setMatchMvpSchema>
