import { afterEach, describe, expect, it, vi } from 'vitest'

const removeBackground = vi.hoisted(() => vi.fn())

vi.mock('@imgly/background-removal', () => ({ removeBackground }))

import {
  calculateCardPhotoPlacement,
  composePlayerCardPhoto,
  extractPlayerCutout,
  findAlphaBounds,
  hasMultipleSignificantAlphaComponents,
  refineAlphaBoundsForCard,
} from '@/lib/player-card-photo-process'
import { MAX_CARD_PHOTO_BYTES } from '@/lib/player-card-photo'

type CanvasHarnessOptions = {
  alpha?: Uint8ClampedArray
  width?: number
  height?: number
  outputBlob?: Blob | null
  outputBlobs?: Array<Blob | null>
}

function installCanvasHarness(options: CanvasHarnessOptions = {}) {
  const width = options.width ?? 2
  const height = options.height ?? 2
  const alpha = options.alpha ?? new Uint8ClampedArray(width * height * 4)
  if (!options.alpha) alpha[3] = 255

  const sourceContext = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: alpha })),
  }
  const outputContext = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    filter: 'none',
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
  }
  const sourceCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => sourceContext),
  }
  const dimensionsAtExport: Array<{ width: number; height: number }> = []
  const outputBlobs =
    options.outputBlobs ??
    [
      'outputBlob' in options
        ? options.outputBlob ?? null
        : new Blob(['png'], { type: 'image/png' }),
    ]
  let exportIndex = 0
  const outputCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => outputContext),
    toBlob: vi.fn((callback: BlobCallback, type?: string) => {
      dimensionsAtExport.push({
        width: outputCanvas.width,
        height: outputCanvas.height,
      })
      expect(type).toBe('image/png')
      callback(outputBlobs[exportIndex++] ?? null)
    }),
  }
  const detailContext = {
    drawImage: vi.fn(),
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
  }
  const detailCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => detailContext),
  }
  const canvases = [sourceCanvas, outputCanvas, detailCanvas]
  const createElement = vi.fn(() => canvases.shift())
  const bitmap = {
    width,
    height,
    close: vi.fn(),
  }
  const createBitmap = vi.fn().mockResolvedValue(bitmap)

  vi.stubGlobal('document', { createElement })
  vi.stubGlobal('createImageBitmap', createBitmap)

  return {
    bitmap,
    createBitmap,
    createElement,
    detailCanvas,
    detailContext,
    dimensionsAtExport,
    outputCanvas,
    outputContext,
    sourceCanvas,
  }
}

function alphaMask(
  width: number,
  height: number,
  rectangles: Array<{ x: number; y: number; width: number; height: number }>,
  noise: Array<{ x: number; y: number }> = [],
) {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (const rectangle of rectangles) {
    for (let y = rectangle.y; y < rectangle.y + rectangle.height; y += 1) {
      for (let x = rectangle.x; x < rectangle.x + rectangle.width; x += 1) {
        rgba[(y * width + x) * 4 + 3] = 255
      }
    }
  }
  for (const pixel of noise) {
    rgba[(pixel.y * width + pixel.x) * 4 + 3] = 255
  }
  return rgba
}

afterEach(() => {
  vi.unstubAllGlobals()
  removeBackground.mockReset()
})

describe('findAlphaBounds', () => {
  it('ignora píxeles transparentes y devuelve los límites exactos', () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4)
    rgba[(1 * 4 + 1) * 4 + 3] = 255
    rgba[(2 * 4 + 2) * 4 + 3] = 255

    expect(findAlphaBounds(rgba, 4, 4)).toEqual({
      x: 1,
      y: 1,
      width: 2,
      height: 2,
    })
  })

  it('incluye alfa igual al umbral e ignora valores inferiores', () => {
    const rgba = new Uint8ClampedArray(3 * 4)
    rgba[3] = 11
    rgba[7] = 12
    rgba[11] = 255

    expect(findAlphaBounds(rgba, 3, 1, 12)).toEqual({
      x: 1,
      y: 0,
      width: 2,
      height: 1,
    })
  })

  it('devuelve null cuando no hay sujeto visible', () => {
    expect(findAlphaBounds(new Uint8ClampedArray(2 * 2 * 4), 2, 2)).toBeNull()
  })
})

describe('hasMultipleSignificantAlphaComponents', () => {
  it('acepta un único componente de primer plano', () => {
    const rgba = alphaMask(12, 8, [{ x: 3, y: 1, width: 5, height: 6 }])

    expect(hasMultipleSignificantAlphaComponents(rgba, 12, 8)).toBe(false)
  })

  it('detecta dos componentes sustanciales desconectados', () => {
    const rgba = alphaMask(14, 8, [
      { x: 1, y: 1, width: 4, height: 6 },
      { x: 9, y: 1, width: 4, height: 6 },
    ])

    expect(hasMultipleSignificantAlphaComponents(rgba, 14, 8)).toBe(true)
  })

  it('ignora islas alfa diminutas separadas del sujeto', () => {
    const rgba = alphaMask(
      14,
      8,
      [{ x: 4, y: 1, width: 6, height: 6 }],
      [
        { x: 0, y: 0 },
        { x: 13, y: 7 },
      ],
    )

    expect(hasMultipleSignificantAlphaComponents(rgba, 14, 8)).toBe(false)
  })

  it('acepta un sujeto fragmentado por piernas o brazos separados', () => {
    const rgba = alphaMask(20, 16, [
      { x: 7, y: 1, width: 6, height: 8 },
      { x: 5, y: 10, width: 3, height: 5 },
      { x: 12, y: 10, width: 3, height: 5 },
      { x: 2, y: 4, width: 2, height: 4 },
    ])

    expect(hasMultipleSignificantAlphaComponents(rgba, 20, 16)).toBe(false)
  })

  it('ignora restos de fondo pequeños junto al sujeto principal', () => {
    const rgba = alphaMask(24, 20, [
      { x: 8, y: 2, width: 8, height: 14 },
      { x: 2, y: 12, width: 3, height: 3 },
      { x: 19, y: 8, width: 2, height: 2 },
    ])

    expect(hasMultipleSignificantAlphaComponents(rgba, 24, 20)).toBe(false)
  })
})

describe('refineAlphaBoundsForCard', () => {
  it('recorta filas casi vacías en los bordes del sujeto', () => {
    const rgba = alphaMask(10, 12, [{ x: 2, y: 2, width: 6, height: 8 }], [
      { x: 3, y: 0 },
      { x: 4, y: 1 },
      { x: 5, y: 10 },
      { x: 6, y: 11 },
    ])

    expect(
      refineAlphaBoundsForCard(rgba, 10, 12, {
        x: 2,
        y: 0,
        width: 6,
        height: 12,
      }),
    ).toEqual({
      x: 2,
      y: 2,
      width: 6,
      height: 8,
    })
  })
})

describe('calculateCardPhotoPlacement', () => {
  it('encaja el sujeto con margen horizontal y lo posiciona con foco en el torso', () => {
    expect(
      calculateCardPhotoPlacement(
        { x: 10, y: 20, width: 400, height: 600 },
        { offsetX: 0, offsetY: 0, scale: 1 },
      ),
    ).toEqual({
      source: { x: 10, y: 20, width: 400, height: 600 },
      destination: { x: 60, y: 216, width: 600, height: 900 },
    })
  })

  it('aplica escala desde el punto focal y offsets como fracciones del lienzo', () => {
    const destination = calculateCardPhotoPlacement(
      { x: 5, y: 8, width: 300, height: 450 },
      { offsetX: 0.1, offsetY: -0.1, scale: 1.2 },
    ).destination

    expect(destination).toMatchObject({ x: 72, width: 720, height: 1080 })
    expect(destination.y).toBeCloseTo(57.6, 5)
  })

  it('limita un sujeto ancho por el margen horizontal', () => {
    expect(
      calculateCardPhotoPlacement(
        { x: 0, y: 0, width: 1200, height: 600 },
        { offsetX: 0, offsetY: 0, scale: 1 },
      ).destination,
    ).toEqual({ x: 60, y: 444, width: 600, height: 300 })
  })

  it('limita un sujeto alto por la altura del lienzo', () => {
    expect(
      calculateCardPhotoPlacement(
        { x: 0, y: 0, width: 200, height: 1000 },
        { offsetX: 0, offsetY: 0, scale: 1 },
      ).destination,
    ).toEqual({ x: 270, y: 216, width: 180, height: 900 })
  })

  it.each([
    { offsetX: Number.NaN, offsetY: 0, scale: 1 },
    { offsetX: 0, offsetY: Number.POSITIVE_INFINITY, scale: 1 },
    { offsetX: 0, offsetY: 0, scale: Number.NaN },
    { offsetX: 0, offsetY: 0, scale: Number.POSITIVE_INFINITY },
    { offsetX: 0, offsetY: 0, scale: 0 },
    { offsetX: 0, offsetY: 0, scale: -1 },
  ])('rechaza ajustes inválidos de forma determinista: %o', (adjustments) => {
    expect(() =>
      calculateCardPhotoPlacement(
        { x: 0, y: 0, width: 200, height: 400 },
        adjustments,
      ),
    ).toThrowError('El encuadre de la foto no es válido.')
  })
})

describe('extractPlayerCutout', () => {
  it('envuelve errores del modelo con un mensaje estable y conserva la causa', async () => {
    const cause = new Error('model failed')
    removeBackground.mockRejectedValueOnce(cause)

    await expect(extractPlayerCutout(new Blob(['source']))).rejects.toMatchObject({
      message: 'No se pudo separar a la persona de la foto.',
      cause,
    })
    expect(removeBackground).toHaveBeenCalledTimes(1)
  })
})

describe('composePlayerCardPhoto', () => {
  it('exporta un PNG transparente y libera todos los recursos', async () => {
    const harness = installCanvasHarness()

    const result = await composePlayerCardPhoto(
      new Blob(['cutout'], { type: 'image/png' }),
    )

    expect(result.type).toBe('image/png')
    expect(harness.dimensionsAtExport).toEqual([{ width: 720, height: 900 }])
    expect(harness.outputContext.filter).toBe(
      'brightness(1.04) contrast(1.05) saturate(1.03)',
    )
    expect(harness.outputContext.fillRect).not.toHaveBeenCalled()
    expect(harness.sourceCanvas).toMatchObject({ width: 0, height: 0 })
    expect(harness.outputCanvas).toMatchObject({ width: 0, height: 0 })
    expect(harness.bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('rechaza cuando canvas no puede producir el Blob y libera recursos', async () => {
    const harness = installCanvasHarness({ outputBlob: null })

    await expect(
      composePlayerCardPhoto(new Blob(['cutout'])),
    ).rejects.toThrowError('No se pudo exportar el recorte.')

    expect(harness.sourceCanvas).toMatchObject({ width: 0, height: 0 })
    expect(harness.outputCanvas).toMatchObject({ width: 0, height: 0 })
    expect(harness.bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('rechaza un recorte sin sujeto y cierra el bitmap', async () => {
    const harness = installCanvasHarness({
      alpha: new Uint8ClampedArray(2 * 2 * 4),
    })

    await expect(
      composePlayerCardPhoto(new Blob(['cutout'])),
    ).rejects.toThrowError('No se detectó una persona en la foto.')

    expect(harness.createElement).toHaveBeenCalledTimes(1)
    expect(harness.sourceCanvas).toMatchObject({ width: 0, height: 0 })
    expect(harness.bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('rechaza un recorte con dos sujetos sustanciales', async () => {
    const width = 14
    const height = 8
    const harness = installCanvasHarness({
      width,
      height,
      alpha: alphaMask(width, height, [
        { x: 1, y: 1, width: 4, height: 6 },
        { x: 9, y: 1, width: 4, height: 6 },
      ]),
    })

    await expect(
      composePlayerCardPhoto(new Blob(['cutout'])),
    ).rejects.toThrowError(
      'Se detectó más de una persona. Usa una foto individual.',
    )
    expect(harness.bitmap.close).toHaveBeenCalledTimes(1)
    expect(harness.sourceCanvas).toMatchObject({ width: 0, height: 0 })
  })

  it('reduce detalle y reexporta cuando el primer PNG supera el límite', async () => {
    const oversized = new Blob(
      [new Uint8Array(MAX_CARD_PHOTO_BYTES + 1)],
      { type: 'image/png' },
    )
    const reduced = new Blob(['reduced'], { type: 'image/png' })
    const harness = installCanvasHarness({
      outputBlobs: [oversized, reduced],
    })

    const result = await composePlayerCardPhoto(new Blob(['cutout']))

    expect(result).toBe(reduced)
    expect(harness.dimensionsAtExport).toEqual([
      { width: 720, height: 900 },
      { width: 720, height: 900 },
    ])
    expect(harness.detailContext.drawImage).toHaveBeenCalled()
    expect(harness.outputContext.clearRect).toHaveBeenCalledWith(0, 0, 720, 900)
    expect(harness.detailCanvas).toMatchObject({ width: 0, height: 0 })
    expect(harness.outputCanvas).toMatchObject({ width: 0, height: 0 })
  })

  it('rechaza el PNG si sigue excediendo el límite después del reintento', async () => {
    const oversized = new Blob(
      [new Uint8Array(MAX_CARD_PHOTO_BYTES + 1)],
      { type: 'image/png' },
    )
    const harness = installCanvasHarness({
      outputBlobs: [oversized, oversized],
    })

    await expect(
      composePlayerCardPhoto(new Blob(['cutout'])),
    ).rejects.toThrowError('El recorte procesado no puede superar 2 MB.')

    expect(harness.dimensionsAtExport).toHaveLength(2)
    expect(harness.detailCanvas).toMatchObject({ width: 0, height: 0 })
    expect(harness.sourceCanvas).toMatchObject({ width: 0, height: 0 })
    expect(harness.outputCanvas).toMatchObject({ width: 0, height: 0 })
    expect(harness.bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('envuelve fallas al abrir el bitmap y conserva la causa', async () => {
    const cause = new Error('decode failed')
    vi.stubGlobal('document', { createElement: vi.fn() })
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValueOnce(cause))

    await expect(
      composePlayerCardPhoto(new Blob(['cutout'])),
    ).rejects.toMatchObject({
      message: 'No se pudo abrir el recorte de la foto.',
      cause,
    })
  })
})
