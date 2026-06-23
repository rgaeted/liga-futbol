import { db } from '@/lib/db'
import { SeasonForm } from '@/components/admin/SeasonForm'

export default async function AdminSeasonsPage() {
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Temporadas</h1>
      <SeasonForm />
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Inicio</th>
              <th className="p-3">Fin</th>
              <th className="p-3">Activa</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((season) => (
              <tr key={season.id} className="border-t border-slate-800">
                <td className="p-3">{season.name}</td>
                <td className="p-3">{season.startDate.toLocaleDateString('es-AR')}</td>
                <td className="p-3">{season.endDate.toLocaleDateString('es-AR')}</td>
                <td className="p-3">{season.isActive ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
