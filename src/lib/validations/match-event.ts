import { z } from 'zod'
import { EventType } from '@prisma/client'

const id = z.string().min(1)

export const createMatchEventSchema = z.object({
  type: z.nativeEnum(EventType),
  minute: z.number().int().min(0).max(130),
  playerId: id.optional(),
  teamId: id.optional(),
  friendlyPlayerId: id.optional(),
  side: z.enum(['A', 'B']).optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateMatchEventInput = z.infer<typeof createMatchEventSchema>
