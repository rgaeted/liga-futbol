import { Suspense } from 'react'
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient'
import { AdminDashboardSkeleton } from '@/components/admin/AdminDashboardSkeleton'

export const dynamic = 'force-dynamic'

export default function AdminHomePage() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminDashboardClient />
    </Suspense>
  )
}
