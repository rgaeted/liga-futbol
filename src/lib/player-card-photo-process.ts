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
/** Punto vertical del sujeto (0 = parte superior del recorte). */
const CARD_PHOTO_FOCUS_Y_IN_SUBJECT = 0.38
/** Altura del lienzo donde cae ese punto (1 = borde inferior). */
const CARD_PHOTO_FOCUS_Y_ON_CANVAS = 0.62
/** Filas con menos densidad se recortan del encuadre automático. */
const CARD_PHOTO_MIN_ROW_DENSITY_RATIO = 0.22
/** Segunda silueta debe ser al menos ~35% del sujeto principal. */
const MIN_SECONDARY_COMPONENT_RATIO = 0.35
/** Dos personas suelen quedar separadas horizontalmente en la foto. */
const MIN_HORIZONTAL_SEPARATION_RATIO = 0.22
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

/**
 * Recorta filas casi vacías en los bordes del sujeto (ruido o texto residual).
 */
export function refineAlphaBoundsForCard(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  bounds: AlphaBounds,
  threshold = ALPHA_COMPONENT_THRESHOLD,
  minRowDensityRatio = CARD_PHOTO_MIN_ROW_DENSITY_RATIO,
): AlphaBounds {
  const rowCounts = new Array(height).fill(0)

  for (let y = bounds.y; y <= bounds.y + bounds.height - 1; y += 1) {
    for (let x = bounds.x; x <= bounds.x + bounds.width - 1; x += 1) {
      if (rgba[(y * width + x) * 4 + 3]! >= threshold) {
        rowCounts[y]! += 1
      }
    }
  }

  let maxCount = 0
  for (let y = bounds.y; y <= bounds.y + bounds.height - 1; y += 1) {
    maxCount = Math.max(maxCount, rowCounts[y]!)
  }

  const minRowCount = Math.max(4, Math.round(maxCount * minRowDensityRatio))
  let top = bounds.y
  let bottom = bounds.y + bounds.height - 1

  while (top < bottom && rowCounts[top]! < minRowCount) top += 1
  while (bottom > top && rowCounts[bottom]! < minRowCount) bottom -= 1

  return {
    x: bounds.x,
    y: top,
    width: bounds.width,
    height: bottom - top + 1,
  }
}

type AlphaComponent = {
  area: number
  sumX: number
  sumY: number
}

export function hasMultipleSignificantAlphaComponents(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = ALPHA_COMPONENT_THRESHOLD,
): boolean {
  const visited = new Uint8Array(width * height)
  const components: AlphaComponent[] = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      if (visited[index] || rgba[index * 4 + 3]! < threshold) continue

      const component: AlphaComponent = { area: 0, sumX: 0, sumY: 0 }
      const stack: Array<{ x: number; y: number }> = [{ x, y }]
      visited[index] = 1

      while (stack.length > 0) {
        const pixel = stack.pop()!
        component.area += 1
        component.sumX += pixel.x
        component.sumY += pixel.y

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue

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
      }

      components.push(component)
    }
  }

  if (components.length < 2) return false

  components.sort((a, b) => b.area - a.area)
  const largest = components[0]!
  const minSecondaryArea = largest.area * MIN_SECONDARY_COMPONENT_RATIO
  const substantial = components.filter(
    (component) => component.area >= minSecondaryArea,
  )
  if (substantial.length < 2) return false

  const minHorizontalSeparation = width * MIN_HORIZONTAL_SEPARATION_RATIO
  for (let i = 0; i < substantial.length; i += 1) {
    const first = substantial[i]!
    const firstX = first.sumX / first.area
    for (let j = i + 1; j < substantial.length; j += 1) {
      const second = substantial[j]!
      const secondX = second.sumX / second.area
      if (Math.abs(firstX - secondX) >= minHorizontalSeparation) {
        return true
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
 * Fits the alpha bounds inside the output canvas and ancla el torso (~38% del
 * sujeto) cerca del centro-bajo de la carta. Los offsets son fracciones del
 * lienzo 720×900; la escala crece desde ese punto focal. Nada se limita: lo
 * que quede fuera se recorta al exportar el canvas.
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
        CARD_PHOTO_FOCUS_Y_ON_CANVAS * CARD_PHOTO_HEIGHT -
        CARD_PHOTO_FOCUS_Y_IN_SUBJECT * destinationHeight +
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
    const rawBounds = findAlphaBounds(rgba.data, bitmap.width, bitmap.height)
    if (!rawBounds) {
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

    const bounds = refineAlphaBoundsForCard(
      rgba.data,
      bitmap.width,
      bitmap.height,
      rawBounds,
    )
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
