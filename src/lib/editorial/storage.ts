import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { editorialStorageBucket } from '@/lib/editorial/urls'
import { deleteR2Objects, readR2Config, uploadR2Object } from '@/lib/media/r2'

let adminClient: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    throw new Error('Supabase no configurado')
  }
  adminClient = createClient(url, secretKey)
  return adminClient
}

export async function uploadEditorialObject(
  path: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  if (readR2Config()) {
    await uploadR2Object(path, buffer, mimeType)
    return
  }
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(editorialStorageBucket()).upload(path, buffer, {
    contentType: mimeType,
    upsert: true,
  })
  if (error) throw error
}

export async function deleteEditorialObject(path: string): Promise<void> {
  await deleteEditorialObjects([path])
}

export async function deleteEditorialObjects(paths: string[]): Promise<void> {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  if (uniquePaths.length === 0) return

  if (readR2Config()) {
    await deleteR2Objects(uniquePaths)
    return
  }
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(editorialStorageBucket()).remove(uniquePaths)
  if (error) throw error
}

export async function bestEffortDeleteEditorialObjects(paths: string[]): Promise<void> {
  try {
    await deleteEditorialObjects(paths)
  } catch (error) {
    console.error('editorial_storage_cleanup_failed', { paths, error })
  }
}

export { editorialPublicUrl, editorialStorageBucket, editorialStoragePath } from '@/lib/editorial/urls'
