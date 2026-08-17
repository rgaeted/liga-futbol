import { z } from 'zod'
import { parseOrganizationSlug } from '@/lib/organization-slug'

const hexColor = /^#[0-9A-Fa-f]{6}$/

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .pipe(z.union([z.string().email(), z.undefined()]))

export const createOrganizationSchema = z
  .object({
    slug: z.string().superRefine((value, ctx) => {
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
    adminEmail: optionalEmail,
    adminName: z.string().trim().optional(),
    adminPassword: z.string().min(6).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.adminEmail) return
    if (!data.adminName || data.adminName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ingresa el nombre del administrador',
        path: ['adminName'],
      })
    }
  })

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

export const updateOrganizationStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']),
})
