import { z } from 'zod'
import { parseOrganizationSlug } from '@/lib/organization-slug'

const hexColor = /^#[0-9A-Fa-f]{6}$/

export const createOrganizationSchema = z.object({
  slug: z
    .string()
    .superRefine((value, ctx) => {
      const parsed = parseOrganizationSlug(value)
      if (!parsed.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: parsed.error === 'reserved' ? 'Slug reservado' : 'Slug inválido',
        })
      }
    }),
  name: z.string().min(2),
  primaryColor: z.string().regex(hexColor, 'Color primario inválido'),
  secondaryColor: z.string().regex(hexColor, 'Color secundario inválido'),
  adminEmail: z.string().email(),
  adminName: z.string().min(2),
  adminPassword: z.string().min(6),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

export const updateOrganizationStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']),
})
