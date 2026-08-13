import { MobilePlatform } from '@prisma/client'
import { z } from 'zod'

const expoPushTokenSchema = z
  .string()
  .regex(/^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/, 'Token push de Expo inválido')

export const mobilePlatformSchema = z.nativeEnum(MobilePlatform)

export const registerInstallationSchema = z.object({
  installationId: z.string().uuid('Identificador de instalación inválido'),
  expoPushToken: expoPushTokenSchema,
  platform: mobilePlatformSchema,
  appVersion: z.string().min(1).max(40).optional(),
})

const teamSubscriptionInputSchema = z.object({
  seasonTeamId: z.string().min(1),
  notifyMatchStart: z.boolean().optional(),
  notifyGoals: z.boolean().optional(),
  notifyFinal: z.boolean().optional(),
})

export const replaceSubscriptionsSchema = z.object({
  teams: z
    .array(teamSubscriptionInputSchema)
    .max(20, 'Puedes seguir como máximo 20 equipos'),
})

export type RegisterInstallationInput = z.infer<typeof registerInstallationSchema>
export type ReplaceSubscriptionsInput = z.infer<typeof replaceSubscriptionsSchema>
