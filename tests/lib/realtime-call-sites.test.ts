import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const expectedCalls = new Map([
  ['src/lib/match-events.ts', 1],
  ['src/lib/match-reconcile.ts', 1],
  ['src/app/api/matches/[id]/mvp/route.ts', 1],
  ['src/app/api/matches/[id]/mvp/[side]/photo/route.ts', 2],
])

describe('Realtime mutation producers', () => {
  it.each([...expectedCalls])('%s awaits invalidation', (path, count) => {
    const source = readFileSync(resolve(process.cwd(), path), 'utf8')
    expect(source).toContain(
      "import { publishMatchInvalidation } from '@/lib/supabase-realtime-server'"
    )
    expect(source.match(/await publishMatchInvalidation\(/g)).toHaveLength(count)
    expect(source).not.toContain('emitMatchUpdate')
    expect(source).not.toContain('@/server/socket')
  })
})
