import { z } from 'zod'

export const grantOrgAdminAccessSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6).optional(),
  organizationIds: z.array(z.string().min(1)).min(1),
})

export type GrantOrgAdminAccessInput = z.infer<typeof grantOrgAdminAccessSchema>
