import { z } from 'zod'
import { parseMobileEditionSlug } from '@/lib/mobile-edition-slug'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/

export const mobileConfigSchema = z
  .object({
  slug: z.string().regex(slugRegex, 'El slug debe usar solo letras minúsculas, números y guiones'),
  displayName: z.string().min(1).max(120),
  shortName: z.string().min(1).max(120).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  primaryColor: z.string().regex(hexColorRegex, 'Color inválido').optional().nullable(),
  secondaryColor: z.string().regex(hexColorRegex, 'Color inválido').optional().nullable(),
  isPublished: z.boolean().optional(),
})
  .superRefine((data, ctx) => {
    const parsed = parseMobileEditionSlug(data.slug)
    if (!parsed.ok) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: parsed.error === 'reserved' ? 'El slug está reservado' : 'Slug inválido',
      })
    }
  })

export const seasonEnrollmentTeamSchema = z.object({
  teamId: z.string().min(1),
  displayName: z.string().min(1).max(120),
  color: z.string().regex(hexColorRegex, 'Color inválido').optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
  playerIds: z.array(z.string().min(1)),
})

export const seasonEnrollmentSchema = z.object({
  categoryId: z.string().min(1),
  teams: z.array(seasonEnrollmentTeamSchema).min(1),
})

export type MobileConfigInput = z.infer<typeof mobileConfigSchema>
export type SeasonEnrollmentInput = z.infer<typeof seasonEnrollmentSchema>

export function slugFromSeasonName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80)
}
