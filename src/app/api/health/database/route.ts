import { db } from '@/lib/db'
import { hasValidCronAuthorization } from '@/lib/database-health'

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
    await db.$queryRaw`SELECT 1 AS ok`

    return Response.json({
      status: 'ok',
      database: 'reachable',
    })
  } catch (error) {
    console.error('GET /api/health/database failed', {
      error:
        error instanceof Error ? error.name : 'UnknownDatabaseHealthError',
    })

    return Response.json(
      {
        status: 'error',
        database: 'unreachable',
      },
      { status: 503 },
    )
  }
}
