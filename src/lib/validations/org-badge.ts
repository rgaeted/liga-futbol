import { z } from 'zod'

export const createOrgBadgeSchema = z.object({
  predicateId: z.string().min(1),
})

export const updateOrgBadgeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  family: z
    .enum(['clutch', 'goleador', 'creador', 'muralla', 'constancia', 'camarin', 'hitos'])
    .optional(),
  rarity: z.enum(['comun', 'raro', 'epico', 'legendario']).optional(),
  iconKey: z.string().trim().min(1).optional(),
  thresholds: z.record(z.string(), z.number()).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const orgBadgeSettingsSchema = z.object({
  badgesEnabled: z.boolean(),
})

export type CreateOrgBadgeInput = z.infer<typeof createOrgBadgeSchema>
export type UpdateOrgBadgeInput = z.infer<typeof updateOrgBadgeSchema>
export type OrgBadgeSettingsInput = z.infer<typeof orgBadgeSettingsSchema>
