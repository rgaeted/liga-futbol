import { hasValidCronAuthorization } from '@/lib/database-health'
import { runNotificationProcessing } from '@/lib/mobile/notifications/trigger-process'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (
    !hasValidCronAuthorization(
      request.headers.get('authorization'),
      process.env.CRON_SECRET,
    )
  ) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await runNotificationProcessing()
    return Response.json({
      status: 'ok',
      processed: result.processed,
    })
  } catch (error) {
    console.error('GET /api/jobs/notifications/process failed', {
      error: error instanceof Error ? error.name : 'UnknownNotificationJobError',
    })

    return Response.json({ status: 'error' }, { status: 503 })
  }
}
