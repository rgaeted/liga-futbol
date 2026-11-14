import type { TeamRoster } from '@/lib/kelme-fixture/rosters'
import { resolveTeamColor } from '@/lib/team-color'

function Crest({ team }: { team: TeamRoster }) {
  if (team.crestUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.crestUrl}
        alt=""
        loading="lazy"
        className="h-12 w-12 shrink-0 rounded-full bg-white object-contain ring-1 ring-black/10"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="h-12 w-12 shrink-0 rounded-full ring-1 ring-black/10"
      style={{ backgroundColor: resolveTeamColor(team.color, team.name) }}
    />
  )
}

/** Sección "Equipos y jugadores": una tarjeta por equipo con su plantilla, agrupada por categoría. */
export function KelmeCupTeams({ teams }: { teams: TeamRoster[] }) {
  if (!teams.some((team) => team.players.length > 0)) return null
  const categories = [...new Set(teams.map((team) => team.category))]

  return (
    <section id="equipos" className="scroll-mt-24 bg-[#f4f9ff] py-8 text-[#123a6b]">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
        <p className="border-l-4 border-[#4b9deb] pl-3 text-[13px] font-extrabold uppercase tracking-[0.19em] text-[#1A7AE8]">
          Plantillas
        </p>
        <h2 className="mt-1 font-display text-[28px] font-bold uppercase tracking-[-0.03em] text-[#0B3D8F]">
          Equipos y jugadores
        </h2>

        {categories.map((category) => (
          <div key={category} className="mt-6">
            <h3 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#4d6790]">
              Categoría {category.replace('-', '–')}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams
                .filter((team) => team.category === category)
                .map((team) => (
                  <article
                    key={team.teamId}
                    className="rounded-2xl border border-[#1A7AE8]/20 bg-white p-4 shadow-[0_8px_20px_rgba(26,122,232,0.06)]"
                  >
                    <header className="flex items-center gap-3">
                      <Crest team={team} />
                      <div className="min-w-0">
                        <p className="font-display text-xl font-bold uppercase leading-tight text-[#0B3D8F]">
                          {team.name}
                        </p>
                        <p className="text-xs font-semibold text-[#4d6790]">
                          {team.players.length > 0 ? `${team.players.length} jugadores` : 'Nómina por confirmar'}
                        </p>
                      </div>
                    </header>
                    {team.players.length > 0 ? (
                      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[14px] font-semibold text-[#123a6b]">
                        {team.players.map((player, index) => (
                          <li key={`${player}-${index}`} className="truncate">
                            {player}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
