import { z } from 'zod'
import { parseContactPhone } from '@/lib/phone-cl'

const phoneField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => !value || parseContactPhone(value).ok, 'Teléfono inválido')

export const createRefereeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  phone: phoneField,
  whatsapp: phoneField,
  notes: z.string().max(500).optional().nullable(),
})

export const patchRefereeSchema = z.object({
  phone: phoneField,
  whatsapp: phoneField,
  notes: z.string().max(500).optional().nullable(),
})

export const shareRefereeSchema = z.object({
  toOrganizationSlug: z.string().min(1),
})

export const grantRefereeAccessSchema = z.object({
  organizationId: z.string().min(1),
})
