import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { editorialPublicUrl, editorialStoragePath } from '@/lib/editorial/storage'

describe('editorialStoragePath', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('joins safe path segments', () => {
    expect(editorialStoragePath(['seasons', 'season-1', 'articles', 'cover.jpg'])).toBe(
      'seasons/season-1/articles/cover.jpg',
    )
  })

  it('rejects path traversal segments', () => {
    expect(() => editorialStoragePath(['seasons', '../secret'])).toThrow()
  })

  it('builds a public URL from storage path', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_STORAGE_BUCKET', 'editorial')
    expect(editorialPublicUrl('seasons/s1/logo.png')).toBe(
      'https://project.supabase.co/storage/v1/object/public/editorial/seasons/s1/logo.png',
    )
  })
})
