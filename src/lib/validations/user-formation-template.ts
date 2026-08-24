import { z } from 'zod'
import { FootballFormat } from '@prisma/client'

const slotLayoutEntrySchema = z.object({
  topPct: z.number().finite().min(5).max(95),
  leftPct: z.number().finite().min(5).max(95),
})

export const createUserFormationTemplateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  baseScheme: z.string().min(1),
  footballFormat: z.nativeEnum(FootballFormat),
  slotLayout: z
    .record(z.string(), slotLayoutEntrySchema)
    .refine((layout) => Object.keys(layout).length > 0, {
      message: 'Debes ajustar al menos una posición',
    }),
})

export const renameUserFormationTemplateSchema = z.object({
  name: z.string().trim().min(2).max(40),
})
