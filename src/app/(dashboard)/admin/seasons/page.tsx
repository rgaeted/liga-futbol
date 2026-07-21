import { db } from '@/lib/db'
import { SeasonForm } from '@/components/admin/SeasonForm'
import { SeasonsTable } from '@/components/admin/SeasonsTable'

export default async function AdminSeasonsPage() {
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Temporadas</h1>
      <SeasonForm />
      <SeasonsTable
        seasons={seasons.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: s.startDate.toISOString().slice(0, 10),
          endDate: s.endDate.toISOString().slice(0, 10),
          footballFormat: s.footballFormat,
          isActive: s.isActive,
        }))}
      />
    </div>
  )
}
