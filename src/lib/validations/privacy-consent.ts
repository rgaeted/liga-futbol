import { z } from 'zod'

export const privacyConsentSchema = z.literal(true, {
  error: 'Debes aceptar la Política de Privacidad para crear tu cuenta.',
})
