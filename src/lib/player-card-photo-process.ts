import {
  CARD_PHOTO_HEIGHT,
  CARD_PHOTO_WIDTH,
  MAX_CARD_PHOTO_BYTES,
} from '@/lib/player-card-photo'

export type CardPhotoAdjustments = {
  offsetX: number
  offsetY: number
  scale: number
}

export type AlphaBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type CardPhotoPlacement = {
  source: AlphaBounds
  destination: AlphaBounds
}

export const DEFAULT_CARD_PHOTO_ADJUSTMENTS: CardPhotoAdjustments = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
}

const CARD_PHOTO_HORIZONTAL_MARGIN = 60
const CARD_PHOTO_FILTER =
  'brightness(1.04) contrast(1.05) saturate(1.03)'
const ALPHA_COMPONENT_THRESHOLD = 12
const MIN_SIGNIFICANT_ALPHA_COMPONENT_AREA = 16
const CARD_PHOTO_SIZE_RETRY_SCALE = 0.85

export function findAlphaBounds(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 12,
): AlphaBounds | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3]! < threshold) continue

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

export function hasMultipleSignificantAlphaComponents(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = ALPHA_COMPONENT_THRESHOLD,
  minArea = MIN_SIGNIFICANT_ALPHA_COMPONENT_AREA,
): boolean {
  const visited = new Uint8Array(width * height)
  let significantComponents = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      if (visited[index] || rgba[index * 4 + 3]! < threshold) continue

      let area = 0
      const stack: Array<{ x: number; y: number }> = [{ x, y }]
      visited[index] = 1

      while (stack.length > 0) {
        const pixel = stack.pop()!
        area += 1

        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ] as const) {
          const nextX = pixel.x + dx
          const nextY = pixel.y + dy
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
            continue
          }

          const nextIndex = nextY * width + nextX
          if (
            visited[nextIndex] ||
            rgba[nextIndex * 4 + 3]! < threshold
          ) {
            continue
          }

          visited[nextIndex] = 1
          stack.push({ x: nextX, y: nextY })
        }
      }

      if (area >= minArea) {
        significantComponents += 1
        if (significantComponents > 1) return true
      }
    }
  }

  return false
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('No se pudo exportar el recorte.'))
        }
      },
      'image/png',
    )
  })
}

async function exportCardPhotoCanvas(
  outputCanvas: HTMLCanvasElement,
): Promise<Blob> {
  let blob = await canvasToPngBlob(outputCanvas)
  if (blob.size <= MAX_CARD_PHOTO_BYTES) return blob

  const outputContext = outputCanvas.getContext('2d')
  if (!outputContext) {
    throw new Error('Tu navegador no permite generar el recorte.')
  }

  const detailCanvas = document.createElement('canvas')
  detailCanvas.width = Math.round(CARD_PHOTO_WIDTH * CARD_PHOTO_SIZE_RETRY_SCALE)
  detailCanvas.height = Math.round(
    CARD_PHOTO_HEIGHT * CARD_PHOTO_SIZE_RETRY_SCALE,
  )
  const detailContext = detailCanvas.getContext('2d')
  if (!detailContext) {
    throw new Error('Tu navegador no permite generar el recorte.')
  }

  detailContext.imageSmoothingEnabled = true
  detailContext.imageSmoothingQuality = 'low'
  detailContext.drawImage(
    outputCanvas,
    0,
    0,
    detailCanvas.width,
    detailCanvas.height,
  )

  outputContext.clearRect(0, 0, CARD_PHOTO_WIDTH, CARD_PHOTO_HEIGHT)
  outputContext.imageSmoothingEnabled = true
  outputContext.imageSmoothingQuality = 'low'
  outputContext.drawImage(
    detailCanvas,
    0,
    0,
    CARD_PHOTO_WIDTH,
    CARD_PHOTO_HEIGHT,
  )

  detailCanvas.width = 0
  detailCanvas.height = 0

  blob = await canvasToPngBlob(outputCanvas)
  if (blob.size > MAX_CARD_PHOTO_BYTES) {
    throw new Error('El recorte procesado no puede superar 2 MB.')
  }

  return blob
}

/**
 * Fits the alpha bounds inside the output canvas, centered and bottom-anchored.
 * Adjustments are applied literally after the fit: offsets are fractions of the
 * 720×900 output and scale grows from the center-bottom anchor. Nothing is
 * clamped; portions outside the output are deterministically clipped by canvas.
 */
export function calculateCardPhotoPlacement(
  bounds: AlphaBounds,
  adjustments: CardPhotoAdjustments,
): CardPhotoPlacement {
  if (
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    !Number.isFinite(adjustments.offsetX) ||
    !Number.isFinite(adjustments.offsetY) ||
    !Number.isFinite(adjustments.scale) ||
    adjustments.scale <= 0
  ) {
    throw new RangeError('El encuadre de la foto no es válido.')
  }

  const availableWidth =
    CARD_PHOTO_WIDTH - CARD_PHOTO_HORIZONTAL_MARGIN * 2
  const fitScale = Math.min(
    availableWidth / bounds.width,
    CARD_PHOTO_HEIGHT / bounds.height,
  )
  const destinationWidth = bounds.width * fitScale * adjustments.scale
  const destinationHeight = bounds.height * fitScale * adjustments.scale

  return {
    source: { ...bounds },
    destination: {
      x:
        (CARD_PHOTO_WIDTH - destinationWidth) / 2 +
        adjustments.offsetX * CARD_PHOTO_WIDTH,
      y:
        CARD_PHOTO_HEIGHT -
        destinationHeight +
        adjustments.offsetY * CARD_PHOTO_HEIGHT,
      width: destinationWidth,
      height: destinationHeight,
    },
  }
}

export async function extractPlayerCutout(source: Blob): Promise<Blob> {
  try {
    const { removeBackground } = await import('@imgly/background-removal')
    return await removeBackground(source, {
      model: 'isnet_quint8',
      output: { format: 'image/png' },
    })
  } catch (cause) {
    throw new Error('No se pudo separar a la persona de la foto.', { cause })
  }
}

export async function composePlayerCardPhoto(
  cutout: Blob,
  adjustments: CardPhotoAdjustments = DEFAULT_CARD_PHOTO_ADJUSTMENTS,
): Promise<Blob> {
  if (
    typeof document === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  ) {
    throw new Error('Tu navegador no permite procesar esta foto.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(cutout)
  } catch (cause) {
    throw new Error('No se pudo abrir el recorte de la foto.', { cause })
  }

  let sourceCanvas: HTMLCanvasElement | null = null
  let outputCanvas: HTMLCanvasElement | null = null
  try {
    sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = bitmap.width
    sourceCanvas.height = bitmap.height
    const sourceContext = sourceCanvas.getContext('2d', {
      willReadFrequently: true,
    })
    if (!sourceContext) {
      throw new Error('Tu navegador no permite procesar esta foto.')
    }

    sourceContext.drawImage(bitmap, 0, 0)
    const rgba = sourceContext.getImageData(
      0,
      0,
      bitmap.width,
      bitmap.height,
    )
    const bounds = findAlphaBounds(rgba.data, bitmap.width, bitmap.height)
    if (!bounds) {
      throw new Error('No se detectó una persona en la foto.')
    }
    if (
      hasMultipleSignificantAlphaComponents(
        rgba.data,
        bitmap.width,
        bitmap.height,
      )
    ) {
      throw new Error(
        'Se detectó más de una persona. Usa una foto individual.',
      )
    }

    outputCanvas = document.createElement('canvas')
    outputCanvas.width = CARD_PHOTO_WIDTH
    outputCanvas.height = CARD_PHOTO_HEIGHT
    const outputContext = outputCanvas.getContext('2d')
    if (!outputContext) {
      throw new Error('Tu navegador no permite generar el recorte.')
    }

    const placement = calculateCardPhotoPlacement(bounds, adjustments)
    outputContext.filter = CARD_PHOTO_FILTER
    outputContext.drawImage(
      sourceCanvas,
      placement.source.x,
      placement.source.y,
      placement.source.width,
      placement.source.height,
      placement.destination.x,
      placement.destination.y,
      placement.destination.width,
      placement.destination.height,
    )

    return await exportCardPhotoCanvas(outputCanvas)
  } finally {
    if (sourceCanvas) {
      sourceCanvas.width = 0
      sourceCanvas.height = 0
    }
    if (outputCanvas) {
      outputCanvas.width = 0
      outputCanvas.height = 0
    }
    bitmap.close()
  }
}

export async function processPlayerCardPhoto(
  source: Blob,
  adjustments?: CardPhotoAdjustments,
): Promise<Blob> {
  const cutout = await extractPlayerCutout(source)
  return composePlayerCardPhoto(cutout, adjustments)
}
