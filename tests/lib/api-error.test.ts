import { describe, it, expect } from 'vitest'
import { formatApiError } from '@/lib/api-error'

describe('formatApiError', () => {
  it('returns string errors as-is', () => {
    expect(formatApiError('Email inválido')).toBe('Email inválido')
  })

  it('formats zod flatten field errors', () => {
    expect(
      formatApiError({
        formErrors: [],
        fieldErrors: { password: ['La contraseña debe tener al menos 6 caracteres'] },
      })
    ).toBe('password: La contraseña debe tener al menos 6 caracteres')
  })
})
