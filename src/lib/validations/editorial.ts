import { EditorialStatus, SponsorPlacement, SponsorTier } from '@prisma/client'
import { z } from 'zod'

const isoDateSchema = z.string().datetime({ offset: true })

export const editorialStatusSchema = z.nativeEnum(EditorialStatus)
export const sponsorPlacementSchema = z.nativeEnum(SponsorPlacement)
export const sponsorTierSchema = z.nativeEnum(SponsorTier)

const optionalUrlSchema = z
  .string()
  .url('URL inválida')
  .refine((value) => /^https?:\/\//i.test(value), 'La URL debe comenzar con http:// o https://')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null))

function validateDateInterval(data: { startsAt?: string | null; endsAt?: string | null }) {
  if (data.startsAt && data.endsAt) {
    return new Date(data.endsAt) >= new Date(data.startsAt)
  }
  return true
}

export const createArticleSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional().nullable(),
  body: z.string().min(1),
  status: editorialStatusSchema.optional(),
})

export const updateArticleSchema = createArticleSchema.partial()

export const createGallerySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  status: editorialStatusSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const updateGallerySchema = createGallerySchema.partial()

export const createGalleryPhotoSchema = z.object({
  altText: z.string().max(200).optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
})

export const updateGalleryPhotoSchema = createGalleryPhotoSchema.partial()

export const reorderGalleryPhotosSchema = z.object({
  photoIds: z.array(z.string().min(1)).min(1),
})

const sponsorBaseSchema = z.object({
  name: z.string().min(1).max(120),
  websiteUrl: optionalUrlSchema,
  placement: sponsorPlacementSchema.optional(),
  tier: sponsorTierSchema.optional(),
  tagline: z.string().max(140).optional().nullable().or(z.literal('').transform(() => null)),
  ctaLabel: z.string().max(40).optional().nullable().or(z.literal('').transform(() => null)),
  ctaUrl: optionalUrlSchema,
  showOnLanding: z.boolean().optional(),
  startsAt: isoDateSchema.optional().nullable(),
  endsAt: isoDateSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const createSponsorSchema = sponsorBaseSchema.refine(validateDateInterval, {
  message: 'La fecha de término debe ser posterior o igual al inicio',
  path: ['endsAt'],
})

export const updateSponsorSchema = sponsorBaseSchema.partial().superRefine((data, ctx) => {
  if (!validateDateInterval(data)) {
    ctx.addIssue({
      code: 'custom',
      message: 'La fecha de término debe ser posterior o igual al inicio',
      path: ['endsAt'],
    })
  }
})

export const sponsorAssignmentSchema = z.object({
  target: z.string().regex(/^(court:([1-9]\d?)|phase:(FINAL|THIRD_PLACE|FIFTH_PLACE))$/),
  sponsorId: z.string().min(1).nullable(),
})

export type SponsorAssignmentInput = z.infer<typeof sponsorAssignmentSchema>
export type CreateGalleryPhotoInput = z.infer<typeof createGalleryPhotoSchema>
export type UpdateGalleryPhotoInput = z.infer<typeof updateGalleryPhotoSchema>
export type CreateArticleInput = z.infer<typeof createArticleSchema>
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>
export type CreateGalleryInput = z.infer<typeof createGallerySchema>
export type UpdateGalleryInput = z.infer<typeof updateGallerySchema>
export type CreateSponsorInput = z.infer<typeof createSponsorSchema>
export type UpdateSponsorInput = z.infer<typeof updateSponsorSchema>
