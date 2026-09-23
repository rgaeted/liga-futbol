import { describe, expect, it } from 'vitest'
import { inferEditorialImageMimeType, validateEditorialImage } from '@/lib/editorial/image'

describe('inferEditorialImageMimeType', () => {
  it('keeps a valid mime type', () => {
    expect(inferEditorialImageMimeType('foto.webp', 'image/webp')).toBe('image/webp')
  })

  it('infers jpeg from .jpg when the browser sends an empty type', () => {
    expect(inferEditorialImageMimeType('foto.jpg', '')).toBe('image/jpeg')
  })
})

describe('validateEditorialImage', () => {
  it('accepts inferred jpeg files', () => {
    const buffer = Buffer.from([1, 2, 3])
    expect(validateEditorialImage(buffer, 'image/jpeg')).toEqual({ ok: true })
  })
})
