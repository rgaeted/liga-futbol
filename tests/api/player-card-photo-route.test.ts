import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, HEAD, POST } from '@/app/api/players/[id]/card-photo/route'
import { validateProcessedCardPhoto } from '@/lib/player-card-photo-validation'

const sharpMetadata = vi.fn()
const sharpRawBuffer = vi.fn()

function createSharpMock() {
  const chain = {
    metadata: sharpMetadata,
    ensureAlpha: vi.fn(() => chain),
    raw: vi.fn(() => chain),
    toBuffer: sharpRawBuffer,
  }
  return chain
}

vi.mock('server-only', () => ({}))
vi.mock('sharp', () => ({
  default: vi.fn(() => createSharpMock()),
}))
vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findUnique: vi.fn(),
    },
    person: {
      findUnique: vi.fn(),
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
import { revalidateOrgAdminRosterPages } from '@/lib/revalidate-org-admin-pages'

const context = { params: Promise.resolve({ id: 'player-1' }) }
const currentOriginal = Buffer.from('current-original')

function imageEtag(bytes: Buffer) {
  return `"${createHash('sha256').update(bytes).digest('hex')}"`
}

function mockTransparentPngRaw() {
  const rgba = Buffer.alloc(720 * 900 * 4, 255)
  rgba[3] = 0
  sharpRawBuffer.mockResolvedValue({
    data: rgba,
    info: { channels: 4 },
  })
}

function cardPhotoRequest(
  bytes = new Uint8Array([1, 2, 3]),
  type = 'image/png',
  sourceEtag: string | null = imageEtag(currentOriginal),
  headers: Record<string, string> = {},
) {
  const form = new FormData()
  form.set('photo', new File([bytes], 'card-photo.png', { type }))
  return new Request('http://localhost/api/players/player-1/card-photo', {
    method: 'POST',
    body: form,
    headers: sourceEtag
      ? { 'If-Match': sourceEtag, ...headers }
      : headers,
  })
}

describe('player card photo validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.person.findUnique).mockResolvedValue({
      photoData: currentOriginal,
    } as never)
  })

  it('requires the exact PNG MIME type', async () => {
    await expect(
      validateProcessedCardPhoto(Buffer.from('image'), 'image/jpeg'),
    ).resolves.toEqual({ ok: false, error: 'El recorte debe ser PNG.' })
    expect(sharpMetadata).not.toHaveBeenCalled()
  })

  it('rejects empty and oversized files', async () => {
    await expect(
      validateProcessedCardPhoto(Buffer.alloc(0), 'image/png'),
    ).resolves.toEqual({
      ok: false,
      error: 'El recorte no puede estar vacío.',
    })
    await expect(
      validateProcessedCardPhoto(Buffer.alloc(2 * 1024 * 1024 + 1), 'image/png'),
    ).resolves.toEqual({
      ok: false,
      error: 'El recorte no puede superar 2 MB.',
    })
    expect(sharpMetadata).not.toHaveBeenCalled()
  })

  it('rejects bytes that are not an actual PNG', async () => {
    sharpMetadata.mockResolvedValue({
      format: 'jpeg',
      width: 720,
      height: 900,
      hasAlpha: true,
    })

    await expect(
      validateProcessedCardPhoto(Buffer.from('not-png'), 'image/png'),
    ).resolves.toEqual({
      ok: false,
      error: 'El archivo no es un PNG válido.',
    })
  })

  it('rejects unreadable image bytes', async () => {
    sharpMetadata.mockRejectedValue(new Error('Invalid image'))

    await expect(
      validateProcessedCardPhoto(Buffer.from('broken'), 'image/png'),
    ).resolves.toEqual({
      ok: false,
      error: 'El archivo no es una imagen válida.',
    })
  })

  it('rejects a PNG without transparency', async () => {
    sharpMetadata.mockResolvedValue({
      format: 'png',
      width: 720,
      height: 900,
      hasAlpha: false,
    })
    sharpRawBuffer.mockResolvedValue({
      data: Buffer.alloc(720 * 900 * 4, 255),
      info: { channels: 4 },
    })

    await expect(
      validateProcessedCardPhoto(Buffer.from('png'), 'image/png'),
    ).resolves.toEqual({
      ok: false,
      error: 'El recorte debe tener fondo transparente.',
    })
  })

  it('requires exact 720×900 dimensions', async () => {
    sharpMetadata.mockResolvedValue({
      format: 'png',
      width: 719,
      height: 900,
      hasAlpha: true,
    })

    await expect(
      validateProcessedCardPhoto(Buffer.from('png'), 'image/png'),
    ).resolves.toEqual({
      ok: false,
      error: 'El recorte debe medir 720×900 px.',
    })
  })

  it('accepts a valid transparent 720×900 PNG', async () => {
    sharpMetadata.mockResolvedValue({
      format: 'png',
      width: 720,
      height: 900,
      hasAlpha: true,
    })
    const rgba = Buffer.alloc(720 * 900 * 4, 255)
    rgba[3] = 0
    sharpRawBuffer.mockResolvedValue({
      data: rgba,
      info: { channels: 4 },
    })

    await expect(
      validateProcessedCardPhoto(Buffer.from('png'), 'image/png'),
    ).resolves.toEqual({ ok: true })
  })
})

describe('GET /api/players/[id]/card-photo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers the persisted card cutout', async () => {
    vi.mocked(db.player.findUnique).mockResolvedValue({
      person: {
        cardPhotoMimeType: 'image/png',
        cardPhotoData: Buffer.from('cutout'),
        cardPhotoUpdatedAt: new Date('2026-09-13T04:00:00Z'),
        photoMimeType: 'image/jpeg',
        photoData: Buffer.from('original'),
      },
    } as never)

    const response = await GET(
      new Request('http://localhost/api/players/player-1/card-photo'),
      context,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=3600, stale-while-revalidate=86400',
    )
    expect(response.headers.get('etag')).toBe(imageEtag(Buffer.from('cutout')))
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('cutout')
  })

  it('falls back to the original player photo', async () => {
    vi.mocked(db.player.findUnique).mockResolvedValue({
      person: {
        cardPhotoMimeType: null,
        cardPhotoData: null,
        cardPhotoUpdatedAt: null,
        photoMimeType: 'image/jpeg',
        photoData: Buffer.from('original'),
      },
    } as never)

    const response = await GET(
      new Request('http://localhost/api/players/player-1/card-photo'),
      context,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(response.headers.get('etag')).toBe(imageEtag(Buffer.from('original')))
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('original')
  })

  it('returns 404 when neither photo exists', async () => {
    vi.mocked(db.player.findUnique).mockResolvedValue({
      person: {
        cardPhotoMimeType: null,
        cardPhotoData: null,
        cardPhotoUpdatedAt: null,
        photoMimeType: null,
        photoData: null,
      },
    } as never)

    const response = await GET(
      new Request('http://localhost/api/players/player-1/card-photo'),
      context,
    )

    expect(response.status).toBe(404)
  })

  it('serves HEAD with the selected photo headers and no body', async () => {
    vi.mocked(db.player.findUnique).mockResolvedValue({
      person: {
        cardPhotoMimeType: 'image/png',
        cardPhotoData: Buffer.from('cutout'),
        cardPhotoUpdatedAt: new Date('2026-09-13T04:00:00Z'),
        photoMimeType: 'image/jpeg',
        photoData: Buffer.from('original'),
      },
    } as never)

    const response = await HEAD(
      new Request('http://localhost/api/players/player-1/card-photo', {
        method: 'HEAD',
      }),
      context,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('etag')).toBe(imageEtag(Buffer.from('cutout')))
    expect(await response.text()).toBe('')
  })

  it('returns 304 for a matching ETag and changes it when bytes change', async () => {
    vi.mocked(db.player.findUnique).mockResolvedValue({
      person: {
        cardPhotoMimeType: 'image/png',
        cardPhotoData: Buffer.from('first-cutout'),
        cardPhotoUpdatedAt: new Date('2026-09-13T04:00:00Z'),
        photoMimeType: 'image/jpeg',
        photoData: Buffer.from('original'),
      },
    } as never)

    const first = await GET(
      new Request('http://localhost/api/players/player-1/card-photo'),
      context,
    )
    const firstEtag = first.headers.get('etag')!

    const notModified = await GET(
      new Request('http://localhost/api/players/player-1/card-photo', {
        headers: { 'If-None-Match': firstEtag },
      }),
      context,
    )
    expect(notModified.status).toBe(304)
    expect(notModified.headers.get('etag')).toBe(firstEtag)
    expect(await notModified.text()).toBe('')

    vi.mocked(db.player.findUnique).mockResolvedValue({
      person: {
        cardPhotoMimeType: 'image/png',
        cardPhotoData: Buffer.from('second-cutout'),
        cardPhotoUpdatedAt: new Date('2026-09-13T04:00:00Z'),
        photoMimeType: 'image/jpeg',
        photoData: Buffer.from('original'),
      },
    } as never)

    const changed = await GET(
      new Request('http://localhost/api/players/player-1/card-photo', {
        headers: { 'If-None-Match': firstEtag },
      }),
      context,
    )
    expect(changed.status).toBe(200)
    expect(changed.headers.get('etag')).not.toBe(firstEtag)
    expect(Buffer.from(await changed.arrayBuffer()).toString()).toBe(
      'second-cutout',
    )
  })

  it('returns 304 for If-None-Match wildcard when a representation exists', async () => {
    vi.mocked(db.player.findUnique).mockResolvedValue({
      person: {
        cardPhotoMimeType: 'image/png',
        cardPhotoData: Buffer.from('cutout'),
        cardPhotoUpdatedAt: new Date('2026-09-13T04:00:00Z'),
        photoMimeType: 'image/jpeg',
        photoData: Buffer.from('original'),
      },
    } as never)

    const response = await GET(
      new Request('http://localhost/api/players/player-1/card-photo', {
        headers: { 'If-None-Match': '*' },
      }),
      context,
    )

    expect(response.status).toBe(304)
    expect(response.headers.get('etag')).toBe(imageEtag(Buffer.from('cutout')))
    expect(await response.text()).toBe('')
  })
})

describe('POST /api/players/[id]/card-photo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.person.findUnique).mockResolvedValue({
      photoData: currentOriginal,
      cardPhotoMimeType: null,
      cardPhotoUpdatedAt: null,
    } as never)
    mockTransparentPngRaw()
  })

  it('returns the delegated authorization error unchanged', async () => {
    const delegated = Response.json({ error: 'No autorizado' }, { status: 403 })
    vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
      error: delegated,
    } as never)

    const response = await POST(cardPhotoRequest(), context)

    expect(response).toBe(delegated)
    expect(response.status).toBe(403)
  })

  it('returns 428 when the source precondition is missing', async () => {
    vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
      player: { personId: 'person-1', organizationId: 'org-1' },
    } as never)

    const response = await POST(
      cardPhotoRequest(new Uint8Array([1, 2, 3]), 'image/png', null),
      context,
    )

    expect(response.status).toBe(428)
    await expect(response.json()).resolves.toEqual({
      error: 'Debes identificar la versión de la foto original.',
    })
    expect(sharpMetadata).not.toHaveBeenCalled()
    expect(db.person.update).not.toHaveBeenCalled()
  })

  it('rejects an oversized multipart request before parsing it', async () => {
    vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
      player: { personId: 'person-1', organizationId: 'org-1' },
    } as never)
    const request = cardPhotoRequest()
    request.headers.set(
      'content-length',
      String(2 * 1024 * 1024 + 256 * 1024 + 1),
    )

    const response = await POST(request, context)

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toEqual({
      error: 'La solicitud para el recorte supera el tamaño máximo permitido.',
    })
    expect(sharpMetadata).not.toHaveBeenCalled()
    expect(db.person.update).not.toHaveBeenCalled()
  })

  it('rejects a PNG without transparency', async () => {
    vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
      player: { personId: 'person-1', organizationId: 'org-1' },
    } as never)
    sharpMetadata.mockResolvedValue({
      format: 'png',
      width: 720,
      height: 900,
      hasAlpha: false,
    })
    sharpRawBuffer.mockResolvedValue({
      data: Buffer.alloc(720 * 900 * 4, 255),
      info: { channels: 4 },
    })

    const response = await POST(cardPhotoRequest(), context)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'El recorte debe tener fondo transparente.',
    })
    expect(db.person.update).not.toHaveBeenCalled()
  })

  it('persists a valid cutout and revalidates the admin roster', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-13T05:06:07.000Z'))
    vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
      player: { personId: 'person-1', organizationId: 'org-1' },
    } as never)
    sharpMetadata.mockResolvedValue({
      format: 'png',
      width: 720,
      height: 900,
      hasAlpha: true,
    })

    try {
      const response = await POST(cardPhotoRequest(), context)

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        ok: true,
        updatedAt: '2026-09-13T05:06:07.000Z',
      })
      expect(db.person.update).toHaveBeenCalledWith({
        where: { id: 'person-1' },
        data: {
          cardPhotoMimeType: 'image/png',
          cardPhotoData: Buffer.from([1, 2, 3]),
          cardPhotoUpdatedAt: new Date('2026-09-13T05:06:07.000Z'),
        },
      })
      expect(revalidateOrgAdminRosterPages).toHaveBeenCalledWith('org-1')
    } finally {
      vi.useRealTimers()
    }
  })

  it('skips create-only writes when a derivative already exists', async () => {
    const existingUpdatedAt = new Date('2026-09-13T04:00:00.000Z')
    vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
      player: { personId: 'person-1', organizationId: 'org-1' },
    } as never)
    vi.mocked(db.person.findUnique).mockResolvedValue({
      photoData: currentOriginal,
      cardPhotoMimeType: 'image/png',
      cardPhotoUpdatedAt: existingUpdatedAt,
    } as never)
    sharpMetadata.mockResolvedValue({
      format: 'png',
      width: 720,
      height: 900,
      hasAlpha: true,
    })
    const request = cardPhotoRequest()
    request.headers.set('If-None-Match', '*')

    const response = await POST(request, context)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      skipped: true,
      updatedAt: existingUpdatedAt.toISOString(),
    })
    expect(db.person.update).not.toHaveBeenCalled()
  })

  it('persists when If-Match identifies the current original bytes', async () => {
    const original = Buffer.from('current-original')
    vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
      player: { personId: 'person-1', organizationId: 'org-1' },
    } as never)
    vi.mocked(db.person.findUnique).mockResolvedValue({
      photoData: original,
    } as never)
    sharpMetadata.mockResolvedValue({
      format: 'png',
      width: 720,
      height: 900,
      hasAlpha: true,
    })

    const response = await POST(
      cardPhotoRequest(
        new Uint8Array([1, 2, 3]),
        'image/png',
        imageEtag(original),
      ),
      context,
    )

    expect(response.status).toBe(200)
    expect(db.person.update).toHaveBeenCalled()
  })

  it('accepts X-Photo-Source-ETag when If-Match is missing', async () => {
    const original = Buffer.from('current-original')
    vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
      player: { personId: 'person-1', organizationId: 'org-1' },
    } as never)
    vi.mocked(db.person.findUnique).mockResolvedValue({
      photoData: original,
      cardPhotoMimeType: null,
      cardPhotoUpdatedAt: null,
    } as never)
    sharpMetadata.mockResolvedValue({
      format: 'png',
      width: 720,
      height: 900,
      hasAlpha: true,
    })

    const response = await POST(
      cardPhotoRequest(new Uint8Array([1, 2, 3]), 'image/png', null, {
        'X-Photo-Source-ETag': imageEtag(original),
      }),
      context,
    )

    expect(response.status).toBe(200)
    expect(db.person.update).toHaveBeenCalled()
  })

  it('rejects 412 when If-Match belongs to an older original', async () => {
    vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
      player: { personId: 'person-1', organizationId: 'org-1' },
    } as never)
    vi.mocked(db.person.findUnique).mockResolvedValue({
      photoData: Buffer.from('new-original'),
    } as never)
    sharpMetadata.mockResolvedValue({
      format: 'png',
      width: 720,
      height: 900,
      hasAlpha: true,
    })

    const response = await POST(
      cardPhotoRequest(
        new Uint8Array([1, 2, 3]),
        'image/png',
        imageEtag(Buffer.from('old-original')),
      ),
      context,
    )

    expect(response.status).toBe(412)
    await expect(response.json()).resolves.toEqual({
      error: 'La foto original cambió. Descárgala y prepara el recorte nuevamente.',
    })
    expect(db.person.update).not.toHaveBeenCalled()
  })
})
