import { MobileApiError } from '@/lib/mobile/errors'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

type RateLimitBucket = {
  count: number
  windowStart: number
}

const buckets = new Map<string, RateLimitBucket>()

/** MVP: limiter en memoria del proceso; no se comparte entre instancias serverless. */
export function checkInstallationRateLimit(key: string, now = Date.now()): void {
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now })
    return
  }

  if (bucket.count >= MAX_REQUESTS) {
    throw new MobileApiError(429, 'Demasiadas solicitudes. Intenta más tarde.')
  }

  bucket.count += 1
}

export function resetInstallationRateLimitForTests(): void {
  buckets.clear()
}
