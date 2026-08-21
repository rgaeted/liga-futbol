import { z } from 'zod'
import { EventType } from '@prisma/client'
import { FOOTBALL_FORMATS } from '@/lib/football-format'
import { teamColorSchema } from '@/lib/team-color'
import { validateChileLocationPair } from '@/lib/chile-locations'
import {
  normalizeRefereeEventTypes,
  validateRefereeEventTypes,
} from '@/lib/match-referee-events'

const id = z.string().min(1)
const footballFormatSchema = z.enum(FOOTBALL_FORMATS)
const locationFieldsSchema = z.object({
  regionCode: z.string().min(1).optional(),
  communeCode: z.string().min(1).optional(),
})

function refineChileLocation(
  data: { regionCode?: string; communeCode?: string },
  ctx: z.RefinementCtx
) {
  const message = validateChileLocationPair(data.regionCode, data.communeCode)
  if (message) {
    ctx.addIssue({ code: 'custom', message, path: ['communeCode'] })
  }
}
const refereeEventTypesSchema = z
  .array(z.nativeEnum(EventType))
  .optional()
  .transform((types) => (types ? normalizeRefereeEventTypes(types) : undefined))
  .superRefine((types, ctx) => {
    if (!types) return
    const message = validateRefereeEventTypes(types)
    if (message) {
      ctx.addIssue({ code: 'custom', message, path: [] })
    }
  })

const rosterPlayerEntry = z.object({
  playerId: id,
  side: z.enum(['A', 'B']),
  isCaptain: z.boolean().optional(),
  isCoach: z.boolean().optional(),
})

function refineFriendlyPlayers(data: { players: z.infer<typeof rosterPlayerEntry>[] }, ctx: z.RefinementCtx) {
  const sides = new Set(data.players.map((p) => p.side))
  if (!sides.has('A') || !sides.has('B')) {
    ctx.addIssue({
      code: 'custom',
      message: 'Debe haber al menos un jugador por lado',
      path: ['players'],
    })
  }
  const ids = data.players.map((p) => p.playerId)
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: 'custom',
      message: 'Un jugador no puede estar dos veces en el mismo partido',
      path: ['players'],
    })
  }
  for (const side of ['A', 'B'] as const) {
    const captains = data.players.filter((p) => p.side === side && p.isCaptain)
    if (captains.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message:
          side === 'A'
            ? 'Debes elegir un capitán para el equipo local (lado A)'
            : 'Debes elegir un capitán para el equipo visitante (lado B)',
        path: ['players'],
      })
    }
    const coaches = data.players.filter((p) => p.side === side && p.isCoach)
    if (coaches.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message:
          side === 'A'
            ? 'Debes elegir un DT para el equipo local (lado A)'
            : 'Debes elegir un DT para el equipo visitante (lado B)',
        path: ['players'],
      })
    }
  }
}

function refineChallengeFriendlyPlayers(
  data: { players: z.infer<typeof rosterPlayerEntry>[] },
  ctx: z.RefinementCtx
) {
  if (data.players.some((player) => player.side !== 'A')) {
    ctx.addIssue({
      code: 'custom',
      message: 'En un desafío solo puedes incluir jugadores del lado A',
      path: ['players'],
    })
  }

  if (data.players.length < 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'Debe haber al menos un jugador en el lado A',
      path: ['players'],
    })
  }

  const ids = data.players.map((player) => player.playerId)
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: 'custom',
      message: 'Un jugador no puede estar dos veces en el mismo partido',
      path: ['players'],
    })
  }

  const captains = data.players.filter((player) => player.isCaptain)
  if (captains.length !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'Debes elegir un capitán para el equipo local (lado A)',
      path: ['players'],
    })
  }

  const coaches = data.players.filter((player) => player.isCoach)
  if (coaches.length !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'Debes elegir un DT para el equipo local (lado A)',
      path: ['players'],
    })
  }
}

export const createLeagueMatchSchema = z
  .object({
    matchType: z.literal('LEAGUE').default('LEAGUE'),
    seasonId: id,
    seasonCategoryId: id,
    homeTeamId: id,
    awayTeamId: id,
    refereeId: id.optional(),
    refereeEventTypes: refereeEventTypesSchema,
    scheduledAt: z.string().datetime(),
    venue: z.string().optional(),
  })
  .merge(locationFieldsSchema)
  .superRefine(refineChileLocation)

export const createFriendlyMatchSchema = z
  .object({
    matchType: z.literal('FRIENDLY'),
    friendlyCategoryId: id,
    footballFormat: footballFormatSchema.default('FUTBOL_11'),
    sideAName: z.string().min(1),
    sideBName: z.string().min(1),
    refereeId: id.optional(),
    refereeEventTypes: refereeEventTypesSchema,
    scheduledAt: z.string().datetime(),
    venue: z.string().optional(),
    players: z.array(rosterPlayerEntry).min(2),
  })
  .merge(locationFieldsSchema)
  .superRefine(refineFriendlyPlayers)
  .superRefine(refineChileLocation)

export const createFriendlyChallengeSchema = z
  .object({
    matchType: z.literal('FRIENDLY'),
    guestOrganizationSlug: z.string().min(1),
    friendlyCategoryId: id,
    footballFormat: footballFormatSchema.default('FUTBOL_11'),
    sideAName: z.string().min(1),
    sideBName: z.string().min(1).optional(),
    refereeId: id.optional(),
    refereeEventTypes: refereeEventTypesSchema,
    scheduledAt: z.string().datetime(),
    venue: z.string().optional(),
    players: z.array(rosterPlayerEntry).min(1),
  })
  .merge(locationFieldsSchema)
  .superRefine(refineChallengeFriendlyPlayers)
  .superRefine(refineChileLocation)

function refineGuestChallengeRosterPlayers(
  data: { players: z.infer<typeof rosterPlayerEntry>[] },
  ctx: z.RefinementCtx
) {
  if (data.players.some((player) => player.side !== 'B')) {
    ctx.addIssue({
      code: 'custom',
      message: 'Solo puedes editar jugadores del lado B',
      path: ['players'],
    })
  }
  if (data.players.length < 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'Debe haber al menos un jugador en tu lado',
      path: ['players'],
    })
  }
  const captains = data.players.filter((player) => player.isCaptain)
  if (captains.length !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'Debes elegir un capitán para tu equipo',
      path: ['players'],
    })
  }
  const coaches = data.players.filter((player) => player.isCoach)
  if (coaches.length !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'Debes elegir un DT para tu equipo',
      path: ['players'],
    })
  }
}

export const updateGuestChallengeRosterSchema = z.object({
  players: z.array(rosterPlayerEntry).min(1),
}).superRefine(refineGuestChallengeRosterPlayers)

export const createMatchSchema = z.preprocess((raw) => {
  if (raw && typeof raw === 'object' && !('matchType' in (raw as object))) {
    return { ...(raw as object), matchType: 'LEAGUE' }
  }
  return raw
}, z.discriminatedUnion('matchType', [createLeagueMatchSchema, createFriendlyMatchSchema]))

export const updateMatchSchema = z
  .object({
    refereeId: id.nullable().optional(),
    refereeEventTypes: refereeEventTypesSchema,
    scheduledAt: z.string().datetime().optional(),
    venue: z.string().nullable().optional(),
    regionCode: z.string().min(1).nullable().optional(),
    communeCode: z.string().min(1).nullable().optional(),
    status: z.enum(['SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'CANCELLED']).optional(),
    footballFormat: footballFormatSchema.optional(),
    sideAColor: teamColorSchema.nullable().optional(),
    sideBColor: teamColorSchema.nullable().optional(),
    players: z.array(rosterPlayerEntry).min(2).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.players) refineFriendlyPlayers({ players: data.players }, ctx)
    if ('regionCode' in data || 'communeCode' in data) {
      refineChileLocation(
        {
          regionCode: data.regionCode ?? undefined,
          communeCode: data.communeCode ?? undefined,
        },
        ctx
      )
    }
  })

export const updateFriendlyPaidSchema = z.object({
  paid: z.boolean(),
})

export const updateFriendlyGalletaSchema = z.object({
  isGalleta: z.boolean(),
})

export type CreateMatchInput = z.infer<typeof createMatchSchema>
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>
export type UpdateFriendlyPaidInput = z.infer<typeof updateFriendlyPaidSchema>
export type UpdateFriendlyGalletaInput = z.infer<typeof updateFriendlyGalletaSchema>

export const fetchMatchWeatherSchema = z
  .object({
    regionCode: z.string().min(1).optional(),
    communeCode: z.string().min(1).optional(),
    scheduledAt: z.string().datetime().optional(),
  })
  .superRefine(refineChileLocation)