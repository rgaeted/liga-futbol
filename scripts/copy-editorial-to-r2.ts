import { createClient } from '@supabase/supabase-js'
import { uploadR2Object } from '@/lib/media/r2'

const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'editorial'

async function listAll(prefix = ''): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) throw new Error('Supabase no configurado')
  const supabase = createClient(url, secret)
  const paths: string[] = []
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) throw error
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id) paths.push(path)
    else paths.push(...(await listAll(path)))
  }
  return paths
}

async function main() {
  const paths = await listAll()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) throw new Error('Supabase no configurado')
  const supabase = createClient(url, secret)
  let copied = 0
  for (const path of paths) {
    const { data, error } = await supabase.storage.from(bucket).download(path)
    if (error || !data) {
      console.error('skip', path, error?.message)
      continue
    }
    const buffer = Buffer.from(await data.arrayBuffer())
    await uploadR2Object(path, buffer, data.type || 'application/octet-stream')
    copied += 1
    console.log('copied', path)
  }
  console.log(`Listo: ${copied}/${paths.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
