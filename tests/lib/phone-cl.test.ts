import { describe, expect, it } from 'vitest'
import { normalizeChilePhone, whatsappMeUrl, parseContactPhone } from '@/lib/phone-cl'

describe('normalizeChilePhone', () => {
  it('assumes Chile 56 when no country code', () => {
    expect(normalizeChilePhone('9 1234 5678')).toBe('56912345678')
  })

  it('keeps explicit 56 prefix', () => {
    expect(normalizeChilePhone('+56 9 1234 5678')).toBe('56912345678')
  })
})

describe('whatsappMeUrl', () => {
  it('builds wa.me from Chilean mobile', () => {
    expect(whatsappMeUrl('912345678')).toBe('https://wa.me/56912345678')
  })
})

describe('parseContactPhone', () => {
  it('rejects too short', () => {
    expect(parseContactPhone('123').ok).toBe(false)
  })

  it('accepts 8-15 digits after strip', () => {
    expect(parseContactPhone('+56 9 1234 5678')).toEqual({ ok: true, digits: '56912345678' })
  })
})
