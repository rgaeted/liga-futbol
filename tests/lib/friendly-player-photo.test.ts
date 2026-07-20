import { describe, it, expect } from 'vitest'
import { validateFriendlyPlayerPhoto } from '@/lib/friendly-player-photo'

describe('validateFriendlyPlayerPhoto', () => {
  it('accepts jpeg under size limit', () => {
    const result = validateFriendlyPlayerPhoto(Buffer.from('fake-image'), 'image/jpeg')
    expect(result).toEqual({ ok: true })
  })

  it('rejects unsupported mime type', () => {
    const result = validateFriendlyPlayerPhoto(Buffer.from('x'), 'image/gif')
    expect(result.ok).toBe(false)
  })

  it('rejects files over 500 KB', () => {
    const result = validateFriendlyPlayerPhoto(Buffer.alloc(500 * 1024 + 1), 'image/png')
    expect(result.ok).toBe(false)
  })
})
