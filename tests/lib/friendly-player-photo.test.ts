import { createHash } from 'node:crypto'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import {
  DELETE as deletePlayerPhoto,
  GET as getPlayerPhoto,
  POST as uploadPlayerPhoto,
} from '@/app/api/players/[id]/photo/route'
import { validateFriendlyPlayerPhoto } from '@/lib/friendly-player-photo'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findUnique: vi.fn(),
    },
    person: {
      update: vi.fn(),
    },
  },
}))
vi.mock('@/lib/player-photo-access', () => ({
  requirePlayerPhotoMutation: vi.fn(),
}))
vi.mock('@/lib/revalidate-org-admin-pages', () => ({
  revalidateOrgAdminRosterPages: vi.fn(),
}))

import { db } from '@/lib/db'
import { requirePlayerPhotoMutation } from '@/lib/player-photo-access'

describe('validateFriendlyPlayerPhoto', () => {
  it('accepts jpeg under size limit', () => {
    const result = validateFriendlyPlayerPhoto(Buffer.from('fake-image'), 'image/jpeg')
    expect(result).toEqual({ ok: true })
  })

  it('rejects unsupported mime type', () => {
    const result = validateFriendlyPlayerPhoto(Buffer.from('x'), 'image/gif')
    expect(result.ok).toBe(false)
  })

  it('accepts files up to 2 MB', () => {
    const result = validateFriendlyPlayerPhoto(Buffer.alloc(2 * 1024 * 1024), 'image/png')
    expect(result).toEqual({ ok: true })
  })

  it('rejects files over 2 MB', () => {
    const result = validateFriendlyPlayerPhoto(Buffer.alloc(2 * 1024 * 1024 + 1), 'image/png')
    expect(result.ok).toBe(false)
  })
})

describe('player original photo invalidates the card cutout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
      player: { personId: 'person-1', organizationId: 'org-1' },
    } as never)
  })

  it('clears all card photo fields when uploading an original', async () => {
    const form = new FormData()
    form.set(
      'photo',
      new File([new Uint8Array([1, 2, 3])], 'player.jpg', {
        type: 'image/jpeg',
      }),
    )

    const response = await uploadPlayerPhoto(
      new Request('http://localhost/api/players/player-1/photo', {
        method: 'POST',
        body: form,
      }),
      { params: Promise.resolve({ id: 'player-1' }) },
    )

    expect(response.status).toBe(200)
    const sourceEtag = `"${createHash('sha256')
      .update(Buffer.from([1, 2, 3]))
      .digest('hex')}"`
    expect(response.headers.get('etag')).toBe(sourceEtag)
    await expect(response.json()).resolves.toEqual({ ok: true, sourceEtag })
    expect(db.person.update).toHaveBeenCalledWith({
      where: { id: 'person-1' },
      data: {
        photoMimeType: 'image/jpeg',
        photoData: Buffer.from([1, 2, 3]),
        cardPhotoMimeType: null,
        cardPhotoData: null,
        cardPhotoUpdatedAt: null,
      },
    })
  })

  it('clears original and card photo fields when deleting the original', async () => {
    const response = await deletePlayerPhoto(
      new Request('http://localhost/api/players/player-1/photo', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'player-1' }) },
    )

    expect(response.status).toBe(200)
    expect(db.person.update).toHaveBeenCalledWith({
      where: { id: 'person-1' },
      data: {
        photoMimeType: null,
        photoData: null,
        cardPhotoMimeType: null,
        cardPhotoData: null,
        cardPhotoUpdatedAt: null,
      },
    })
  })
})

describe('GET player original photo', () => {
  it('exposes a stable byte-derived ETag', async () => {
    const original = Buffer.from('original-bytes')
    vi.mocked(db.player.findUnique).mockResolvedValue({
      person: {
        photoMimeType: 'image/jpeg',
        photoData: original,
      },
    } as never)

    const response = await getPlayerPhoto(
      new Request('http://localhost/api/players/player-1/photo'),
      { params: Promise.resolve({ id: 'player-1' }) },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('etag')).toBe(
      `"${createHash('sha256').update(original).digest('hex')}"`,
    )
  })
})
