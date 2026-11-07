export function editorialStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET ?? 'editorial'
}

export function editorialStoragePath(segments: string[]): string {
  for (const segment of segments) {
    if (!segment || segment.includes('..') || segment.includes('/') || segment.includes('\\')) {
      throw new Error('Segmento de ruta inválido')
    }
  }
  return segments.join('/')
}

export function editorialPublicUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null
  const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/+$/, '')
  if (mediaBase) return `${mediaBase}/${storagePath}`
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  if (!baseUrl) return null
  return `${baseUrl}/storage/v1/object/public/${editorialStorageBucket()}/${storagePath}`
}
