import { Suspense } from 'react'
import { AdminDashboardHome } from '@/components/admin/AdminDashboardHome'
import { AdminDashboardSkeleton } from '@/components/admin/AdminDashboardSkeleton'
import { getAdminDashboardData } from '@/lib/admin-dashboard'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function AdminDashboardContent({ seasonId }: { seasonId?: string }) {
  const data = await getAdminDashboardData(seasonId)
  return <AdminDashboardHome data={data} />
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>
}) {
  const { season } = await searchParams

  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminDashboardContent seasonId={season} />
    </Suspense>
  )
}
