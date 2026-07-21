import { z } from 'zod'
import { EventType } from '@prisma/client'

const id = z.string().min(1)

export const createMatchEventSchema = z.object({
  type: z.nativeEnum(EventType),
  minute: z.number().int().min(0).max(130).optional(),
  playerId: id.optional(),
  teamId: id.optional(),
  friendlyPlayerId: id.optional(),
  assistPlayerId: id.optional(),
  assistFriendlyPlayerId: id.optional(),
  side: z.enum(['A', 'B']).optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateMatchEventSchema = z.object({
  type: z.nativeEnum(EventType).optional(),
  minute: z.number().int().min(0).max(130).optional(),
  playerId: id.nullable().optional(),
  teamId: id.nullable().optional(),
  friendlyPlayerId: id.nullable().optional(),
  assistPlayerId: id.nullable().optional(),
  assistFriendlyPlayerId: id.nullable().optional(),
  side: z.enum(['A', 'B']).nullable().optional(),
  description: z.string().nullable().optional(),
})

export type CreateMatchEventInput = z.infer<typeof createMatchEventSchema>
export type UpdateMatchEventInput = z.infer<typeof updateMatchEventSchema>
