import { describe, expect, it } from 'vitest'
import { serializeOrganizationDirectoryItem } from '@/lib/organizations-directory'

describe('serializeOrganizationDirectoryItem', () => {
  it('returns public fields only', () => {
    expect(
      serializeOrganizationDirectoryItem({
        id: '1',
        slug: 'kelme',
        name: 'Torneos Kelme',
        logoStoragePath: null,
        status: 'ACTIVE',
      }),
    ).toEqual({
      id: '1',
      slug: 'kelme',
      name: 'Torneos Kelme',
      logoUrl: null,
    })
  })
})
