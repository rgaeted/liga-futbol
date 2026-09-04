import { z } from 'zod'

const accentColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')

export const createOrgAwardSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa un nombre'),
  shortLabel: z.string().trim().min(1, 'Ingresa una etiqueta corta'),
  emoji: z.string().trim().min(1).max(8),
  description: z.string().trim().optional(),
  accentColor: accentColorSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const updateOrgAwardSchema = createOrgAwardSchema.partial()

export type CreateOrgAwardInput = z.infer<typeof createOrgAwardSchema>
export type UpdateOrgAwardInput = z.infer<typeof updateOrgAwardSchema>
