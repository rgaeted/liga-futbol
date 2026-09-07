import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { resolveUserNavAvatarUrl } from '@/lib/user-nav-avatar'

describe('resolveUserNavAvatarUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns player photo url when person has photo', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      person: {
        photoMimeType: 'image/jpeg',
        photoData: Buffer.from('x'),
        players: [{ id: 'player-1' }],
      },
      refereeProfile: null,
    } as never)

    await expect(resolveUserNavAvatarUrl('user-1')).resolves.toBe('/api/players/player-1/photo')
  })

  it('falls back to referee storage photo', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.mocked(db.user.findUnique).mockResolvedValue({
      person: null,
      refereeProfile: { photoStoragePath: 'referees/u1/photo.jpg' },
    } as never)

    const url = await resolveUserNavAvatarUrl('user-1')
    expect(url).toContain('referees/u1/photo.jpg')
  })

  it('returns null when user has no photo', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      person: {
        photoMimeType: null,
        photoData: null,
        players: [{ id: 'player-1' }],
      },
      refereeProfile: null,
    } as never)

    await expect(resolveUserNavAvatarUrl('user-1')).resolves.toBeNull()
  })
})
