import { z } from 'zod'

export const reorderOrgHeroImagesSchema = z.object({
  imageIds: z.array(z.string().min(1)).min(1),
})

export type ReorderOrgHeroImagesInput = z.infer<typeof reorderOrgHeroImagesSchema>
