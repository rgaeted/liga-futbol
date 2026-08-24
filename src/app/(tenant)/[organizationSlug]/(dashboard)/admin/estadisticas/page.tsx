import { Suspense } from 'react'
import { AdminAnalyticsClient } from '@/components/admin/AdminAnalyticsClient'
import { AdminDashboardSkeleton } from '@/components/admin/AdminDashboardSkeleton'

export const dynamic = 'force-dynamic'

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminAnalyticsClient />
    </Suspense>
  )
}
