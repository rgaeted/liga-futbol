import { describe, expect, it } from 'vitest'
import { parseDeepLink } from '../../src/lib/deep-links'

describe('parseDeepLink', () => {
  it('maps custom scheme match links', () => {
    expect(parseDeepLink('kelmeinvierno2026://matches/m1')).toEqual({
      pathname: '/matches/m1',
    })
  })

  it('rejects unknown https links', () => {
    expect(parseDeepLink('https://invalid.example')).toEqual({ pathname: '/' })
  })
})
