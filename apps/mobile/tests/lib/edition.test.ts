import { describe, expect, it } from 'vitest'
import { getEditionConfig } from '../../src/lib/edition'

describe('getEditionConfig', () => {
  it('loads the Puerto Varas edition selected by EDITION', () => {
    const config = getEditionConfig('liga-invierno-kelme-puerto-varas-2026')
    expect(config.slug).toBe('liga-invierno-kelme-puerto-varas-2026')
    expect(config.iosBundleIdentifier).toBeTruthy()
    expect(config.androidPackage).toBeTruthy()
  })

  it('rejects unknown edition keys', () => {
    expect(() => getEditionConfig('unknown-edition')).toThrow(/Edición desconocida/)
  })
})
