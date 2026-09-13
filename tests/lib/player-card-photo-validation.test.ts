import { beforeAll, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { validateProcessedCardPhoto } from '@/lib/player-card-photo-validation'

vi.mock('server-only', () => ({}))

let opaqueRgbaPng: Buffer
let transparentRgbaPng: Buffer

beforeAll(async () => {
  opaqueRgbaPng = await sharp({
    create: {
      width: 720,
      height: 900,
      channels: 4,
      background: { r: 20, g: 40, b: 60, alpha: 1 },
    },
  })
    .png()
    .toBuffer()

  transparentRgbaPng = await sharp({
    create: {
      width: 720,
      height: 900,
      channels: 4,
      background: { r: 20, g: 40, b: 60, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer()
})

describe('validateProcessedCardPhoto with real PNGs', () => {
  it('rejects a fully opaque RGBA PNG', async () => {
    await expect(
      validateProcessedCardPhoto(opaqueRgbaPng, 'image/png'),
    ).resolves.toEqual({
      ok: false,
      error: 'El recorte debe tener fondo transparente.',
    })
  })

  it('accepts a PNG containing transparent pixels', async () => {
    await expect(
      validateProcessedCardPhoto(transparentRgbaPng, 'image/png'),
    ).resolves.toEqual({ ok: true })
  })
})
