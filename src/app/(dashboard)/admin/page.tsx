import { AdminDashboardHome } from '@/components/admin/AdminDashboardHome'
import { getAdminDashboardData } from '@/lib/admin-dashboard'

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>
}) {
  const { season } = await searchParams
  const data = await getAdminDashboardData(season)

  return <AdminDashboardHome data={data} />
}
