import Link from 'next/link'
import { FriendlyPlayerPhotoUpload } from '@/components/admin/FriendlyPlayerPhotoUpload'
import { personHasPhoto } from '@/lib/friendly-player-photo'
import { requirePlayerDashboardContext } from '@/lib/player-dashboard-access'
import { orgPath } from '@/lib/tenant-paths'

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const context = await requirePlayerDashboardContext(organizationSlug)

  if (!context) {
    return (
      <p className="text-kelme-gray-900">
        No tienes ficha de jugador en esta liga. Si jugaste partidos aquí, pide al administrador que
        enlace tu cuenta con tu ficha.
      </p>
    )
  }

  const { session, player, playerWithTeam } = context

  return (
    <div className="space-y-6 text-kelme-gray-900">
      <header>
        <p className="text-sm text-kelme-gray-400">
          <Link href={orgPath(organizationSlug, '/player')} className="text-kelme-red hover:underline">
            ← Volver a mi panel
          </Link>
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">Mi perfil</h1>
        <p className="text-kelme-gray-400">Tu foto y datos de ficha en esta liga.</p>
      </header>

      <section className="rounded-xl border border-kelme-border bg-kelme-surface p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <FriendlyPlayerPhotoUpload
            playerId={player.id}
            firstName={playerWithTeam.person.firstName}
            lastName={playerWithTeam.person.lastName}
            hasPhoto={personHasPhoto(playerWithTeam.person)}
            size="lg"
          />
          <dl className="min-w-0 flex-1 space-y-3 text-sm">
            <div>
              <dt className="text-kelme-gray-400">Nombre en la liga</dt>
              <dd className="font-semibold">{session.user.name}</dd>
            </div>
            <div>
              <dt className="text-kelme-gray-400">Equipo</dt>
              <dd className="font-semibold">{playerWithTeam.team?.name ?? 'Sin equipo'}</dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-kelme-gray-400">Número</dt>
                <dd className="font-semibold">#{playerWithTeam.jerseyNumber ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-kelme-gray-400">Posición</dt>
                <dd className="font-semibold">{playerWithTeam.position ?? '—'}</dd>
              </div>
            </div>
          </dl>
        </div>
      </section>
    </div>
  )
}
