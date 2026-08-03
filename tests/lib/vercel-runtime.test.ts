import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
) as {
  engines: Record<string, string>
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

describe('Vercel runtime contract', () => {
  it('targets Node.js 22 and standard Next.js commands', () => {
    expect(packageJson.engines.node).toBe('22.x')
    expect(packageJson.scripts.dev).toBe('next dev')
    expect(packageJson.scripts.build).toBe('prisma generate && next build')
    expect(packageJson.scripts.start).toBe('next start')
  })

  it('keeps the selected Supabase SDK and removes Socket.IO', () => {
    expect(packageJson.dependencies['@supabase/supabase-js']).toBeDefined()
    expect(packageJson.dependencies['socket.io']).toBeUndefined()
    expect(packageJson.dependencies['socket.io-client']).toBeUndefined()
    expect(packageJson.devDependencies.tsx).toBeDefined()
  })

  it('removes custom runtime files', () => {
    expect(existsSync(resolve(process.cwd(), 'server.ts'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/server/socket.ts'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/lib/socket-client.ts'))).toBe(false)
  })
})
