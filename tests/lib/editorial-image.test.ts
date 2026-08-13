import { describe, expect, it } from 'vitest'
import { validateEditorialImage } from '@/lib/editorial/image'

describe('validateEditorialImage', () => {
  it('accepts a valid webp image', () => {
    expect(validateEditorialImage(Buffer.alloc(1024), 'image/webp')).toEqual({ ok: true })
  })

  it('rejects images larger than 2 MiB', () => {
    expect(
      validateEditorialImage(Buffer.alloc(2 * 1024 * 1024 + 1), 'image/webp'),
    ).toMatchObject({ ok: false })
  })

  it('rejects unsupported mime types', () => {
    expect(validateEditorialImage(Buffer.alloc(10), 'image/gif')).toMatchObject({ ok: false })
  })

  it('rejects empty files', () => {
    expect(validateEditorialImage(Buffer.alloc(0), 'image/png')).toMatchObject({ ok: false })
  })
})
