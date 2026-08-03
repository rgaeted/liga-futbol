const BROADCAST_TIMEOUT_MS = 5_000

export async function publishMatchInvalidation(matchId: string): Promise<void> {
  const normalizedMatchId = matchId.trim()
  if (!normalizedMatchId) {
    console.error('supabase_realtime_publish_failed', {
      matchId: null,
      reason: 'empty_match_id',
    })
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    console.error('supabase_realtime_publish_failed', {
      matchId: normalizedMatchId,
      reason: 'missing_configuration',
    })
    return
  }

  try {
    const response = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `match:${normalizedMatchId}`,
            event: 'invalidate',
            payload: { matchId: normalizedMatchId },
          },
        ],
      }),
      signal: AbortSignal.timeout(BROADCAST_TIMEOUT_MS),
    })

    if (!response.ok) {
      console.error('supabase_realtime_publish_failed', {
        matchId: normalizedMatchId,
        reason: 'http_error',
        status: response.status,
      })
    }
  } catch (error) {
    console.error('supabase_realtime_publish_failed', {
      matchId: normalizedMatchId,
      reason: error instanceof Error ? error.name : 'unknown_error',
    })
  }
}
