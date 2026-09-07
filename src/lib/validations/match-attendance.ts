import { z } from 'zod'

export const upsertMatchAttendanceSchema = z
  .object({})
  .strict()
  .optional()
