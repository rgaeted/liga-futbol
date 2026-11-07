import { z } from 'zod'

export const MAX_ORG_HERO_IMAGES = 12

export const reorderOrgHeroImagesSchema = z.object({
  imageIds: z.array(z.string().min(1)).min(1),
})

export type ReorderOrgHeroImagesInput = z.infer<typeof reorderOrgHeroImagesSchema>
