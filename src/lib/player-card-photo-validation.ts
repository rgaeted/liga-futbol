import 'server-only'
import sharp from 'sharp'
import {
  CARD_PHOTO_HEIGHT,
  CARD_PHOTO_WIDTH,
  MAX_CARD_PHOTO_BYTES,
} from '@/lib/player-card-photo'

export async function validateProcessedCardPhoto(
  buffer: Buffer,
  mimeType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (mimeType !== 'image/png') {
    return { ok: false, error: 'El recorte debe ser PNG.' }
  }
  if (buffer.byteLength === 0) {
    return { ok: false, error: 'El recorte no puede estar vacío.' }
  }
  if (buffer.byteLength > MAX_CARD_PHOTO_BYTES) {
    return { ok: false, error: 'El recorte no puede superar 2 MB.' }
  }

  try {
    const metadata = await sharp(buffer).metadata()
    if (metadata.format !== 'png') {
      return { ok: false, error: 'El archivo no es un PNG válido.' }
    }
    if (
      metadata.width !== CARD_PHOTO_WIDTH ||
      metadata.height !== CARD_PHOTO_HEIGHT
    ) {
      return {
        ok: false,
        error: `El recorte debe medir ${CARD_PHOTO_WIDTH}×${CARD_PHOTO_HEIGHT} px.`,
      }
    }
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    let hasTransparentPixel = false
    for (let i = 3; i < data.length; i += info.channels) {
      if (data[i]! < 250) {
        hasTransparentPixel = true
        break
      }
    }
    if (!hasTransparentPixel) {
      return {
        ok: false,
        error: 'El recorte debe tener fondo transparente.',
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'El archivo no es una imagen válida.' }
  }
}
