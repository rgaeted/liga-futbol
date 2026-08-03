'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let realtimeClient: SupabaseClient | null = null

export function getSupabaseRealtimeClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
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
