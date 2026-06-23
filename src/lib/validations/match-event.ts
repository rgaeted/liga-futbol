import { z } from 'zod'
import { EventType } from '@prisma/client'

export const createMatchEventSchema = z.object({
  type: z.nativeEnum(EventType),
  minute: z.number().int().min(0).max(130),
  playerId: z.string().cuid().optional(),
  teamId: z.string().cuid().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateMatchEventInput = z.infer<typeof createMatchEventSchema>
