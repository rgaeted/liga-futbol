import { z } from 'zod'
import { FOOTBALL_FORMATS } from '@/lib/football-format'
import { teamColorSchema } from '@/lib/team-color'

const id = z.string().min(1)
const footballFormatSchema = z.enum(FOOTBALL_FORMATS)

const friendlyPlayerEntry = z.object({
  friendlyPlayerId: id,
  side: z.enum(['A', 'B']),
})

function refineFriendlyPlayers(data: { players: z.infer<typeof friendlyPlayerEntry>[] }, ctx: z.RefinementCtx) {
  const sides = new Set(data.players.map((p) => p.side))
  if (!sides.has('A') || !sides.has('B')) {
    ctx.addIssue({
      code: 'custom',
      message: 'Debe haber al menos un jugador por lado',
      path: ['players'],
    })
  }
  const ids = data.players.map((p) => p.friendlyPlayerId)
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: 'custom',
      message: 'Un jugador no puede estar dos veces en el mismo partido',
      path: ['players'],
    })
  }
}

export const createLeagueMatchSchema = z.object({
  matchType: z.literal('LEAGUE').default('LEAGUE'),
  seasonId: id,
  homeTeamId: id,
  awayTeamId: id,
  refereeId: id.optional(),
  scheduledAt: z.string().datetime(),
  venue: z.string().optional(),
})

export const createFriendlyMatchSchema = z
  .object({
    matchType: z.literal('FRIENDLY'),
    friendlyCategoryId: id,
    footballFormat: footballFormatSchema.default('FUTBOL_11'),
    sideAName: z.string().min(1),
    sideBName: z.string().min(1),
    refereeId: id.optional(),
    scheduledAt: z.string().datetime(),
    venue: z.string().optional(),
    players: z.array(friendlyPlayerEntry).min(2),
  })
  .superRefine(refineFriendlyPlayers)

export const createMatchSchema = z.preprocess((raw) => {
  if (raw && typeof raw === 'object' && !('matchType' in (raw as object))) {
    return { ...(raw as object), matchType: 'LEAGUE' }
  }
  return raw
}, z.discriminatedUnion('matchType', [createLeagueMatchSchema, createFriendlyMatchSchema]))

export const updateMatchSchema = z
  .object({
    refereeId: id.nullable().optional(),
    scheduledAt: z.string().datetime().optional(),
    venue: z.string().nullable().optional(),
    status: z.enum(['SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'CANCELLED']).optional(),
    footballFormat: footballFormatSchema.optional(),
    sideAColor: teamColorSchema.nullable().optional(),
    sideBColor: teamColorSchema.nullable().optional(),
    players: z.array(friendlyPlayerEntry).min(2).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.players) refineFriendlyPlayers({ players: data.players }, ctx)
  })

export const updateFriendlyPaidSchema = z.object({
  paid: z.boolean(),
})

export type CreateMatchInput = z.infer<typeof createMatchSchema>
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>
export type UpdateFriendlyPaidInput = z.infer<typeof updateFriendlyPaidSchema>