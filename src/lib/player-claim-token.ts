import { createHmac, timingSafeEqual } from 'crypto'

function claimSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET is required to sign player claim links')
  }
  return secret
}

/** Server-only: do not import from client components. */
export function createPlayerClaimToken(playerId: string): string {
  if (typeof window !== 'undefined') {
    throw new Error('createPlayerClaimToken must run on the server')
  }
  return createHmac('sha256', claimSecret()).update(playerId).digest('base64url')
}

export function verifyPlayerClaimToken(playerId: string, token: string): boolean {
  if (!token) return false
  let expected: string
  try {
    expected = createPlayerClaimToken(playerId)
  } catch {
    return false
  }
  if (expected.length !== token.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}
