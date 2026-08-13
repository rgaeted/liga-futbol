import { after } from 'next/server'
import { processPendingNotifications } from '@/lib/mobile/notifications/process-outbox'

export const DEFAULT_NOTIFICATION_PROCESS_LIMIT = 5
export const CRON_NOTIFICATION_PROCESS_LIMIT = 20

export async function runNotificationProcessing(
  limit = CRON_NOTIFICATION_PROCESS_LIMIT,
) {
  return processPendingNotifications({ limit })
}

export function triggerNotificationProcessing(
  limit = DEFAULT_NOTIFICATION_PROCESS_LIMIT,
) {
  after(async () => {
    try {
      await runNotificationProcessing(limit)
    } catch (error) {
      console.warn('mobile_notification_process_failed', {
        reason: error instanceof Error ? error.name : 'unknown_error',
      })
    }
  })
}
