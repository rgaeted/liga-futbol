import { describe, expect, it } from 'vitest'
import { pausedOrganizationPayload } from '@/lib/organization-status'

describe('pausedOrganizationPayload', () => {
  it('returns a 503 body without revealing existence details', () => {
    expect(pausedOrganizationPayload()).toEqual({
      error: 'Organización no disponible',
    })
  })
})
