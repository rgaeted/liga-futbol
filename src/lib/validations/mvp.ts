import { z } from 'zod'

const id = z.string().min(1)

export const matchMvpSideSchema = z.enum(['HOME', 'AWAY'])

export const setMatchMvpSchema = z.object({
  side: matchMvpSideSchema,
  playerId: id.nullable().optional(),
})

export type SetMatchMvpInput = z.infer<typeof setMatchMvpSchema>
