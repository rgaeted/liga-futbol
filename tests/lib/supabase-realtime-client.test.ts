import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRealtimeClient } from '@/lib/supabase-realtime-client'

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

describe('Supabase Realtime browser client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('returns null without public configuration', () => {
    expect(getSupabaseRealtimeClient()).toBeNull()
  })

  it('disables Supabase Auth persistence', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key')
    vi.mocked(createClient).mockReturnValue({} as never)
    getSupabaseRealtimeClient()
    expect(createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'publishable-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )
  })
})
