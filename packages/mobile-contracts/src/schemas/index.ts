import { z } from 'zod'

const matchStatusCodeSchema = z.enum([
  'SCHEDULED',
  'LIVE',
  'HALFTIME',
  'FINISHED',
  'CANCELLED',
])

const isoDateSchema = z.string().datetime({ offset: true })

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/)

export const mobileTeamRefSchema = z.object({
  seasonTeamId: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  crestUrl: z.string().nullable(),
  initials: z.string().min(1),
})

export const mobileMatchSummarySchema = z.object({
  id: z.string().min(1),
  scheduledAt: isoDateSchema,
  status: matchStatusCodeSchema,
  statusLabel: z.string().min(1),
  home: mobileTeamRefSchema,
  away: mobileTeamRefSchema,
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  venue: z.string().nullable(),
  locationLabel: z.string().nullable(),
})

export const mobileMatchDetailSchema = mobileMatchSummarySchema.extend({
  footballFormat: z.string().min(1),
  weather: z
    .object({
      label: z.string(),
      tempC: z.number(),
      humidityPct: z.number(),
      windKmh: z.number(),
    })
    .nullable(),
})

export const mobileLeagueConfigSchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1),
  shortName: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  primaryColor: hexColorSchema.nullable(),
  secondaryColor: hexColorSchema.nullable(),
  footballFormat: z.string().min(1),
  season: z.object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  }),
})

export const mobileStandingRowSchema = z.object({
  rank: z.number().int().min(1),
  seasonTeamId: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  crestUrl: z.string().nullable(),
  pj: z.number().int().min(0),
  pg: z.number().int().min(0),
  pe: z.number().int().min(0),
  pp: z.number().int().min(0),
  gf: z.number().int().min(0),
  gc: z.number().int().min(0),
  dg: z.number().int(),
  pts: z.number().int().min(0),
})

export const mobilePlayerStatsDtoSchema = z.object({
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
  yellowCards: z.number().int().min(0),
  redCards: z.number().int().min(0),
  mvpCount: z.number().int().min(0),
})

export const mobileStatRowSchema = z.object({
  rosterEntryId: z.string().min(1),
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  teamName: z.string().min(1),
  jerseyNumber: z.number().int().nullable(),
  position: z.string().nullable(),
  value: z.number().int().min(0),
  stats: mobilePlayerStatsDtoSchema,
})

export const mobileStatsResponseSchema = z.object({
  scorers: z.array(mobileStatRowSchema),
  assists: z.array(mobileStatRowSchema),
  yellowCards: z.array(mobileStatRowSchema),
  redCards: z.array(mobileStatRowSchema),
  mvps: z.array(mobileStatRowSchema),
})

export const mobileTeamListItemSchema = mobileTeamRefSchema.extend({
  nextMatchAt: isoDateSchema.nullable(),
})

export const mobileRosterPlayerSchema = z.object({
  rosterEntryId: z.string().min(1),
  playerId: z.string().min(1),
  name: z.string().min(1),
  jerseyNumber: z.number().int().nullable(),
  position: z.string().nullable(),
  stats: mobilePlayerStatsDtoSchema,
})

export const mobileTeamDetailSchema = mobileTeamRefSchema.extend({
  roster: z.array(mobileRosterPlayerSchema),
  upcomingMatches: z.array(mobileMatchSummarySchema),
  recentResults: z.array(mobileMatchSummarySchema),
})

export const mobilePlayerDetailSchema = z.object({
  rosterEntryId: z.string().min(1),
  playerId: z.string().min(1),
  name: z.string().min(1),
  teamName: z.string().min(1),
  seasonTeamId: z.string().min(1),
  jerseyNumber: z.number().int().nullable(),
  position: z.string().nullable(),
  stats: mobilePlayerStatsDtoSchema,
})

export const mobileLiveClockSchema = z.object({
  status: matchStatusCodeSchema,
  clockStartedAt: isoDateSchema.nullable(),
  secondHalfStartedAt: isoDateSchema.nullable(),
  halftimeAt: isoDateSchema.nullable(),
})

export const mobileLiveEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  minute: z.number().int().min(0),
  createdAt: isoDateSchema,
  playerName: z.string().nullable(),
  assistName: z.string().nullable(),
  description: z.string().nullable(),
  teamName: z.string().nullable(),
  teamCrestUrl: z.string().nullable(),
  teamColor: z.string().nullable(),
})

export const mobileLiveSnapshotSchema = z.object({
  id: z.string().min(1),
  status: matchStatusCodeSchema,
  home: mobileTeamRefSchema,
  away: mobileTeamRefSchema,
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  clock: mobileLiveClockSchema,
  events: z.array(mobileLiveEventSchema),
  venue: z.string().nullable(),
  locationLabel: z.string().nullable(),
  weather: z
    .object({
      label: z.string(),
      tempC: z.number(),
      humidityPct: z.number(),
      windKmh: z.number(),
    })
    .nullable(),
})

export const mobileArticleSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().nullable(),
  coverUrl: z.string().nullable(),
  publishedAt: isoDateSchema,
})

export const mobileArticleDetailSchema = mobileArticleSummarySchema.extend({
  body: z.string().min(1),
})

export const mobileGallerySummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  coverUrl: z.string().nullable(),
  photoCount: z.number().int().min(0),
  publishedAt: isoDateSchema,
})

export const mobileGalleryPhotoSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  altText: z.string().nullable(),
  caption: z.string().nullable(),
})

export const mobileGalleryDetailSchema = mobileGallerySummarySchema.extend({
  description: z.string().nullable(),
  photos: z.array(mobileGalleryPhotoSchema),
})

export const mobileSponsorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  placement: z.string().min(1),
})

const mobilePlatformCodeSchema = z.enum(['IOS', 'ANDROID'])

const mobileInstallationStatusCodeSchema = z.enum(['ACTIVE', 'INACTIVE'])

const notificationKindCodeSchema = z.enum(['MATCH_START', 'GOAL', 'MATCH_FINISH'])

const expoPushTokenSchema = z
  .string()
  .regex(/^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/)

export const registerInstallationRequestSchema = z.object({
  installationId: z.string().uuid(),
  expoPushToken: expoPushTokenSchema,
  platform: mobilePlatformCodeSchema,
  appVersion: z.string().min(1).max(40).optional(),
})

export const registerInstallationResponseSchema = z.object({
  installationId: z.string().uuid(),
  status: mobileInstallationStatusCodeSchema,
})

const teamSubscriptionInputSchema = z.object({
  seasonTeamId: z.string().min(1),
  notifyMatchStart: z.boolean().optional(),
  notifyGoals: z.boolean().optional(),
  notifyFinal: z.boolean().optional(),
})

export const replaceSubscriptionsRequestSchema = z.object({
  teams: z.array(teamSubscriptionInputSchema).max(20),
})

export const replaceSubscriptionsResponseSchema = z.object({
  teams: z.array(
    z.object({
      seasonTeamId: z.string().min(1),
      notifyMatchStart: z.boolean(),
      notifyGoals: z.boolean(),
      notifyFinal: z.boolean(),
    }),
  ),
})

export const mobilePushDataSchema = z.object({
  type: z.literal('match'),
  slug: z.string().min(1),
  matchId: z.string().min(1),
  kind: notificationKindCodeSchema,
  path: z.string().regex(/^\/matches\/[^/]+$/),
})

export function mobilePaginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
  })
}
