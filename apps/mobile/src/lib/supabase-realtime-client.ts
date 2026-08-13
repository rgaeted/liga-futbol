import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getRuntimeExtra } from './runtime-config'

let realtimeClient: SupabaseClient | null = null

export function getSupabaseRealtimeClient(): SupabaseClient | null {
  const extra = getRuntimeExtra()
  const url = extra.supabaseUrl
  const publishableKey = extra.supabaseAnonKey
  if (!url || !publishableKey) return null

  realtimeClient ??= createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return realtimeClient
}

export function resetSupabaseRealtimeClientForTests() {
  realtimeClient = null
}
