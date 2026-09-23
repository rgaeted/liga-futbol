import { z } from 'zod'
import { privacyConsentSchema } from '@/lib/validations/privacy-consent'

export const registerUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  acceptPrivacyPolicy: privacyConsentSchema,
})

export type RegisterUserInput = z.infer<typeof registerUserSchema>
