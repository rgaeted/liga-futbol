/** Cache en memoria de recortes PNG por URL de foto (sesión del navegador). */
const cutoutCache = new Map<string, string>()

export function getCachedPlayerCardCutout(fotoUrl: string): string | null {
  return cutoutCache.get(fotoUrl) ?? null
}

export function cachePlayerCardCutout(fotoUrl: string, objectUrl: string): void {
  cutoutCache.set(fotoUrl, objectUrl)
}

export async function loadPlayerCardCutout(fotoUrl: string): Promise<string | null> {
  const cached = cutoutCache.get(fotoUrl)
  if (cached) return cached

  const { removeBackground } = await import('@imgly/background-removal')
  const absUrl = new URL(fotoUrl, window.location.origin).href
  const blob = await removeBackground(absUrl, {
    model: 'isnet_quint8',
    output: { format: 'image/png' },
  })
  const objectUrl = URL.createObjectURL(blob)
  cutoutCache.set(fotoUrl, objectUrl)
  return objectUrl
}
