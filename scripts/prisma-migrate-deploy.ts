#!/usr/bin/env node
/**
 * Runs `prisma migrate deploy` with retries.
 * Neon/Render can fail with P1002 when a previous deploy left an advisory lock.
 */
import { execSync } from 'node:child_process'

const MAX_ATTEMPTS = 3
const DELAY_MS = 20_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
      return
    } catch {
      const isLast = attempt === MAX_ATTEMPTS
      console.error(`[migrate] attempt ${attempt}/${MAX_ATTEMPTS} failed`)
      if (isLast) {
        process.exit(1)
      }
      console.error(`[migrate] waiting ${DELAY_MS / 1000}s before retry...`)
      await sleep(DELAY_MS)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
